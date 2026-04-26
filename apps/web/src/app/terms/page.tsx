import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Coolive",
  description: "Les règles d'utilisation de Coolive.",
}

const LAST_UPDATED = '24 avril 2026'

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Conditions d&apos;utilisation</h1>
      <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : {LAST_UPDATED}</p>

      <div className="prose prose-sm mt-8 max-w-none space-y-6 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold">1. Objet</h2>
          <p>
            Coolive est une plateforme de mise en relation entre personnes cherchant ou proposant une colocation
            en Polynésie française, éditée par Tarima (<a href="https://tarima.dev" className="text-primary underline">tarima.dev</a>).
            Coolive ne fournit ni service de location, ni service immobilier réglementé, et n&apos;est pas partie
            aux contrats conclus entre utilisateurs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Acceptation</h2>
          <p>
            En créant un compte ou en utilisant Coolive, tu acceptes ces conditions ainsi que la{' '}
            <Link href="/privacy" className="text-primary underline">politique de confidentialité</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Compte</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Tu dois être majeur·e (18 ans ou plus) pour créer un compte.</li>
            <li>Les informations que tu fournis doivent être exactes et à jour.</li>
            <li>Tu es responsable de la confidentialité de ton mot de passe.</li>
            <li>Un seul compte par personne.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Annonces</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Les annonces doivent décrire un logement réel, disponible, situé en Polynésie française.</li>
            <li>Les photos doivent t&apos;appartenir ou être utilisées avec autorisation.</li>
            <li>Le prix doit être indiqué en XPF, charges précisées si possible.</li>
            <li>Les annonces frauduleuses, discriminatoires, ou illégales sont interdites et seront supprimées.</li>
            <li>La discrimination fondée sur l&apos;origine, le sexe, la religion, l&apos;orientation, le handicap ou
              tout autre critère protégé est strictement interdite.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Candidatures</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Une candidature est une demande de mise en relation, pas un engagement contractuel.</li>
            <li>L&apos;annonceur est libre d&apos;accepter ou de refuser sans justification (dans le respect de la non-discrimination).</li>
            <li>Lorsqu&apos;une candidature est acceptée, les coordonnées sont révélées aux deux parties pour permettre la suite hors-plateforme.</li>
            <li>Coolive n&apos;intervient pas dans la rédaction du bail, le paiement du loyer, ni la gestion du logement.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Comportement attendu</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Sois respectueux·se des autres utilisateurs.</li>
            <li>Ne harcèle pas, ne menace pas, n&apos;envoie pas de contenu sexuellement explicite.</li>
            <li>N&apos;utilise pas Coolive pour du démarchage commercial non lié à la colocation.</li>
            <li>Ne tente pas d&apos;abuser, de scraper ou de surcharger le service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Modération et sanctions</h2>
          <p>
            Coolive se réserve le droit de supprimer toute annonce, candidature ou compte qui enfreint ces
            conditions, sans préavis et sans remboursement (le service étant gratuit). Tu peux signaler un
            comportement inapproprié à <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Limitation de responsabilité</h2>
          <p>
            Coolive est fourni « en l&apos;état », sans garantie. Coolive ne garantit pas l&apos;exactitude des
            annonces, ni la solvabilité ou le comportement des utilisateurs. Coolive ne pourra être tenu
            responsable des dommages directs ou indirects résultant de l&apos;utilisation du service, dans la
            limite de ce que permet la loi applicable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Propriété intellectuelle</h2>
          <p>
            Tu conserves tous les droits sur les contenus que tu publies (photos, textes). En les publiant sur
            Coolive, tu nous accordes une licence non exclusive, gratuite, mondiale, pour les afficher dans le
            cadre du service. Le nom Coolive et le logo restent la propriété de Tarima.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Suppression de compte</h2>
          <p>
            Tu peux supprimer ton compte à tout moment depuis l&apos;application (Paramètres → Supprimer mon
            compte). La suppression est définitive : annonces, candidatures, photos et message sont effacés.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Modifications</h2>
          <p>
            Ces conditions peuvent être mises à jour. Les changements significatifs te seront notifiés par
            email. La poursuite de l&apos;utilisation après notification vaut acceptation.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">12. Droit applicable</h2>
          <p>
            Le droit applicable est le droit français. En cas de litige, les juridictions compétentes sont
            celles de Papeete, sauf disposition légale contraire en faveur d&apos;un consommateur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">13. Contact</h2>
          <p>
            <a href="mailto:hello@tarima.dev" className="text-primary underline">hello@tarima.dev</a>
          </p>
        </section>
      </div>
    </main>
  )
}
