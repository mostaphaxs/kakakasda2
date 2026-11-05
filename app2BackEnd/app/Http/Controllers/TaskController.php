<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    private const RULES = [
        'title' => 'required|string|max:255',
        'notes' => 'nullable|string',
        'due_date' => 'nullable|date',
        'due_time' => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
        'priority' => 'nullable|in:normale,haute',
        'client_id' => 'nullable|exists:clients,id',
        'contact_name' => 'nullable|string|max:120',
        'contact_phone' => 'nullable|string|max:40',
    ];

    /** ?status=open|done|all (default all), ?client_id= */
    public function index(Request $request): JsonResponse
    {
        $q = Task::with('client:id,nom,prenom,tel,tel_2,cin');
        if ($request->filled('client_id')) $q->where('client_id', $request->integer('client_id'));
        $status = $request->input('status', 'all');
        if ($status === 'open') $q->whereNull('done_at');
        if ($status === 'done') $q->whereNotNull('done_at');
        // open tasks: soonest first, undated last; done: most recent first
        $tasks = $q->get()->sortBy(fn ($t) => [
            $t->done_at ? 1 : 0,
            $t->done_at ? -strtotime($t->done_at) : 0,
            $t->due_date ? $t->due_date->format('Y-m-d') . ($t->due_time ?? '99:99') : '9999-99-99',
            $t->priority === 'haute' ? 0 : 1,
        ])->values();
        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $v = $request->validate(self::RULES);
        $v['priority'] = $v['priority'] ?? 'normale';
        return response()->json(Task::create($v)->load('client:id,nom,prenom,tel,tel_2,cin'), 201);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $rules = self::RULES;
        $rules['title'] = 'sometimes|required|string|max:255';
        $v = $request->validate($rules + ['done' => 'sometimes|boolean']);
        if (array_key_exists('done', $v)) {
            $v['done_at'] = $v['done'] ? now() : null;
            unset($v['done']);
        }
        $task->update($v);
        return response()->json($task->fresh()->load('client:id,nom,prenom,tel,tel_2,cin'));
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return response()->json(['message' => 'Tâche supprimée.']);
    }
}
