<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reusable WhatsApp messages (FR + AR). Variables like {prenom} or {reste}
     * are filled per client in the app.
     */
    public function up(): void
    {
        Schema::create('message_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->default('autre'); // bienvenue | paiement | chantier | signature | evenement | autre
            $table->text('body_fr');
            $table->text('body_ar')->nullable();
            $table->timestamps();
        });

        $now = now();
        $rows = [
            ['Bienvenue', 'bienvenue',
                "Bonjour {prenom} {nom},\n\nBienvenue chez {societe} ! Merci pour votre confiance concernant votre *{bien}* (projet {projet}).\n\nNotre équipe reste à votre disposition pour toute question.\n{societe}",
                "مرحباً {prenom} {nom}،\n\nمرحباً بكم في {societe}! شكراً على ثقتكم بخصوص *{bien}* (مشروع {projet}).\n\nفريقنا رهن إشارتكم لأي استفسار.\n{societe}"],
            ['Rappel de paiement', 'paiement',
                "Bonjour {prenom} {nom},\n\nNous vous rappelons que votre prochaine échéance de *{montant_echeance} DH* est prévue le *{date_echeance}*.\nReste à payer sur votre bien : {reste} DH.\n\nMerci de votre confiance.\n{societe}",
                "مرحباً {prenom} {nom}،\n\nنذكركم بأن القسط المقبل بمبلغ *{montant_echeance} درهم* مستحق بتاريخ *{date_echeance}*.\nالمبلغ المتبقي: {reste} درهم.\n\nشكراً على ثقتكم.\n{societe}"],
            ['Avancement des travaux', 'chantier',
                "Bonjour {prenom} {nom},\n\nBonne nouvelle : les travaux de votre *{bien}* avancent bien.\n- Gros œuvre : *{gros_oeuvre}%*\n- Finition : *{finition}%*\n\nNous vous tiendrons informé(e) des prochaines étapes.\n{societe}",
                "مرحباً {prenom} {nom}،\n\nخبر سار: أشغال *{bien}* تتقدم بشكل جيد.\n- الأشغال الكبرى: *{gros_oeuvre}%*\n- التشطيب: *{finition}%*\n\nسنوافيكم بالمراحل المقبلة.\n{societe}"],
            ['Invitation à la signature', 'signature',
                "Bonjour {prenom} {nom},\n\nVotre dossier pour le *{bien}* est prêt. Nous vous invitons à passer à nos bureaux pour la signature.\nMerci de nous indiquer le jour qui vous convient et de vous munir de votre CIN.\n\n{societe}",
                "مرحباً {prenom} {nom}،\n\nملفكم الخاص بـ *{bien}* جاهز. ندعوكم لزيارة مكتبنا من أجل التوقيع.\nالمرجو إخبارنا باليوم المناسب لكم وإحضار البطاقة الوطنية.\n\n{societe}"],
            ['Journée de visite du chantier', 'evenement',
                "Bonjour {prenom} {nom},\n\nNous organisons une *journée de visite* du projet {projet} le *samedi …* de 10h à 13h.\nCe sera l'occasion de voir l'avancement de votre {bien}.\n\nAu plaisir de vous accueillir !\n{societe}",
                "مرحباً {prenom} {nom}،\n\nننظم *يوم زيارة* لمشروع {projet} يوم *السبت …* من 10 صباحاً إلى 1 زوالاً.\nستكون فرصة لرؤية تقدم أشغال {bien}.\n\nفي انتظاركم!\n{societe}"],
        ];
        foreach ($rows as [$name, $cat, $fr, $ar]) {
            DB::table('message_templates')->insert([
                'name' => $name, 'category' => $cat, 'body_fr' => $fr, 'body_ar' => $ar,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('message_templates');
    }
};
