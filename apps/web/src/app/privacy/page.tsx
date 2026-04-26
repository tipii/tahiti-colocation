import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Coolive',
  description: 'Comment Coolive collecte, utilise et protège tes données personnelles.',
}

const LAST_UPDATED = '24 avril 2026'

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {LAST_UPDATED}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Qui sommes-nous</h2>
          <p>
            Coolive est une plateforme de mise en relation entre personnes cherchant ou proposant une colocation
            en Polynésie française. Coolive est édité par Tarima (<a href="https://tarima.dev" className="text-primary underline">tarima.dev</a>),
            responsable du traitement des données, joignable à l&apos;adresse <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Données que nous collectons</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Identité</strong> : nom, prénom, email, date de naissance, photo de profil.</li>
            <li><strong>Profil</strong> : bio, métier, langues parlées, mode de vie (tabac, animaux, horaires).</li>
            <li><strong>Contact</strong> : numéro de téléphone, WhatsApp, lien Facebook.</li>
            <li><strong>Annonces</strong> : titre, description, prix, photos, localisation, équipements.</li>
            <li><strong>Candidatures</strong> : message, date d&apos;emménagement souhaitée, statut.</li>
            <li><strong>Compte</strong> : identifiants Better Auth (email + mot de passe haché ou OAuth Facebook).</li>
            <li><strong>Technique</strong> : adresse IP, agent utilisateur, journaux d&apos;accès.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Pourquoi nous les utilisons</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Faire fonctionner le service de mise en relation (base légale : exécution du contrat).</li>
            <li>Vérifier ton identité par email (intérêt légitime : sécurité du service).</li>
            <li>Permettre à un annonceur de juger une candidature (exécution du contrat).</li>
            <li>Te notifier d&apos;événements liés à tes candidatures par email et notification push (exécution du contrat).</li>
            <li>Détecter les abus et garantir la sécurité (intérêt légitime).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Avec qui nous partageons</h2>
          <p>Tes données ne sont vendues à personne. Nous utilisons les sous-traitants suivants :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Brevo</strong> (UE / France) — envoi des emails transactionnels.</li>
            <li><strong>Cloudflare R2</strong> — stockage des images.</li>
            <li><strong>Cloudflare</strong> — distribution réseau et protection contre les attaques.</li>
            <li><strong>Expo Push</strong> — envoi des notifications push mobile.</li>
            <li><strong>Facebook</strong> — uniquement si tu choisis de te connecter avec Facebook.</li>
          </ul>
          <p>
            Lorsqu&apos;une candidature est acceptée, tes coordonnées (téléphone, email, WhatsApp, Facebook) sont
            révélées à l&apos;autre partie pour permettre la prise de contact en dehors de la plateforme.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Combien de temps</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong>Compte actif</strong> : tant que ton compte existe.</li>
            <li><strong>Annonces archivées</strong> : 12 mois après archivage, puis suppression.</li>
            <li><strong>Journaux techniques</strong> : 12 mois maximum.</li>
            <li><strong>Sauvegardes</strong> : 30 jours.</li>
          </ul>
          <p>Tu peux supprimer ton compte à tout moment depuis l&apos;application (Paramètres → Supprimer mon compte). La suppression est immédiate et définitive.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Tes droits</h2>
          <p>Conformément au RGPD et à la loi Informatique et Libertés, tu peux à tout moment :</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Accéder à tes données et les exporter (Paramètres → Télécharger mes données).</li>
            <li>Rectifier les informations de ton profil.</li>
            <li>Supprimer ton compte (Paramètres → Supprimer mon compte).</li>
            <li>T&apos;opposer au traitement ou en demander la limitation, en nous écrivant.</li>
            <li>Introduire une réclamation auprès de la CNIL si tu estimes tes droits non respectés (<a href="https://www.cnil.fr" className="text-primary underline">cnil.fr</a>).</li>
          </ul>
          <p>Pour toute demande, écris-nous à <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Cookies</h2>
          <p>
            Nous utilisons uniquement des cookies strictement nécessaires au fonctionnement du service
            (session, authentification). Aucun cookie publicitaire ou de suivi tiers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Sécurité</h2>
          <p>
            Les mots de passe sont hachés via scrypt. Les communications transitent en HTTPS. Les sauvegardes sont
            chiffrées. Aucun système n&apos;est invulnérable, mais nous appliquons les standards de l&apos;industrie.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Mineurs</h2>
          <p>
            Coolive est réservé aux personnes majeures (18 ans ou plus). Si tu apprends qu&apos;un mineur a créé un
            compte, signale-le à <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Modifications</h2>
          <p>
            Cette politique peut évoluer. La date de dernière mise à jour est indiquée en haut de page. Les
            changements significatifs te seront notifiés par email.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Contact</h2>
          <p>
            <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>
          </p>
        </section>
      </div>
    </main>
  )
}
