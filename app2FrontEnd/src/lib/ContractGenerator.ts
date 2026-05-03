import jsPDF from 'jspdf';

interface ClientData {
    nom: string;
    prenom: string;
    cin: string;
    tel: string;
    adresse?: string;
}

interface PropertyData {
    type_bien: string;
    num_appartement: string;
    surface_m2: number;
    prix_global: number;
    etage?: string;
    projet_nom: string;
}

export const generateContract = (type: 'RESERVATION' | 'COMPROMIS', client: ClientData, property: PropertyData) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text("SOCIÉTÉ LES CINQ ÉLÉMENTS", margin, y);

    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text("Promotion Immobilière & Travaux Divers", margin, y);
    doc.text("Casablanca, Maroc | Tel: +212 5XX XX XX XX", margin, y + 5);

    y += 25;
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, y, 190, y);

    // --- Title ---
    y += 20;
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const title = type === 'RESERVATION' ? "CONTRAT DE RÉSERVATION" : "COMPROMIS DE VENTE";
    doc.text(title, 105, y, { align: 'center' });

    // --- Body ---
    y += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("ENTRE LES SOUSSIGNÉS :", margin, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`1. La Société LES CINQ ÉLÉMENTS, représentée par son gérant, ci-après dénommée "Le Promoteur".`, margin, y, { maxWidth: 170 });

    y += 15;
    doc.text(`2. M./Mme ${client.nom.toUpperCase()} ${client.prenom.toUpperCase()},`, margin, y);
    y += 7;
    doc.text(`Titulaire de la CIN n° : ${client.cin.toUpperCase()},`, margin, y);
    y += 7;
    doc.text(`Désigné(e) ci-après "Le Bénéficiaire".`, margin, y);

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.text("OBJET DU CONTRAT :", margin, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Le Bénéficiaire réserve par la présente le bien immobilier suivant dans le projet "${property.projet_nom}" :`, margin, y, { maxWidth: 170 });

    y += 15;
    const propertyInfo = [
        `Type de bien : ${property.type_bien}`,
        `Référence : Bloc/Appt ${property.num_appartement}`,
        `Étage : ${property.etage || 'RDC'}`,
        `Surface approx. : ${property.surface_m2} m²`,
        `Prix Global : ${property.prix_global.toLocaleString('fr-MA')} DH`
    ];

    propertyInfo.forEach(info => {
        doc.text(`• ${info}`, margin + 5, y);
        y += 7;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("CONDITIONS FINANCIÈRES :", margin, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Le prix de vente total est fixé à ${property.prix_global.toLocaleString('fr-MA')} DH Toutes Taxes Comprises.`, margin, y, { maxWidth: 170 });

    // --- Signatures ---
    y = 250;
    doc.setFontSize(10);
    doc.text("Fait à Casablanca, le " + new Date().toLocaleDateString('fr-FR'), margin, y);

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("LU ET APPROUVÉ", margin, y);
    doc.text("LU ET APPROUVÉ", 140, y);

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Le Bénéficiaire", margin, y);
    doc.text("Le Promoteur", 140, y);

    // Save
    const fileName = `${type}_${client.nom}_${property.num_appartement}.pdf`;
    doc.save(fileName);
};
