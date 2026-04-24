<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

use Illuminate\Support\Facades\DB;

class UniqueReference implements ValidationRule
{
    protected $ignoreId;
    protected $table;

    /**
     * @param string|null $table The table to ignore the ID from (e.g. 'payments')
     * @param int|null $ignoreId The ID to ignore
     */
    public function __construct($table = null, $ignoreId = null)
    {
        $this->table = $table;
        $this->ignoreId = $ignoreId;
    }

    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (empty($value)) return;

        // Check in 'payments' table
        $query1 = DB::table('payments')->where('reference_no', $value);
        if ($this->table === 'payments' && $this->ignoreId) {
            $query1->where('id', '!=', $this->ignoreId);
        }
        
        // Check in 'contractor_payments' table
        $query2 = DB::table('contractor_payments')->where('reference_no', $value);
        if ($this->table === 'contractor_payments' && $this->ignoreId) {
            $query2->where('id', '!=', $this->ignoreId);
        }

        // Check in 'general_works' table
        $query3 = DB::table('general_works')->where('reference_no', $value);
        if ($this->table === 'general_works' && $this->ignoreId) {
            $query3->where('id', '!=', $this->ignoreId);
        }

        if ($query1->exists() || $query2->exists() || $query3->exists()) {
            $fail("Cette référence ({$value}) est déjà utilisée pour un autre paiement dans le système.");
        }
    }
}
