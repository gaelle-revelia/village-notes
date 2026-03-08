import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">{children}</h2>
);

const Para = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm leading-relaxed text-foreground/85 mb-3">{children}</p>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed text-foreground/85 mb-3 pl-1">
    {items.map((item, i) => (
      <li key={i}>{item}</li>
    ))}
  </ul>
);

const PolitiqueConfidentialite = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button onClick={() => navigate("/auth")} className="text-foreground">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Politique de confidentialité</h1>
      </div>

      {/* Content */}
      <div className="max-w-[640px] mx-auto px-4 pt-4">
        <div
          className="rounded-2xl p-5 sm:p-6"
          style={{
            background: "rgba(255,255,255,0.38)",
            backdropFilter: "blur(16px) saturate(1.6)",
            WebkitBackdropFilter: "blur(16px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow:
              "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <h1 className="text-2xl font-semibold text-foreground mb-1">
            Politique de confidentialité
          </h1>
          <p className="text-lg font-semibold text-foreground/70 mb-6">The Village</p>

          {/* Section 1 */}
          <SectionTitle>1 — Identité du responsable de traitement</SectionTitle>
          <Para>
            Société : REVEL.IA<br />
            Forme juridique : SARL<br />
            Application : The Village<br />
            URL :{" "}
            <a href="https://the-village.app" className="text-primary hover:underline" target="_blank" rel="noreferrer">
              https://the-village.app
            </a>
            <br />
            Email :{" "}
            <a href="mailto:contact@the-village.app" className="text-primary hover:underline">
              contact@the-village.app
            </a>
            <br />
            Adresse : 2 rue Albert Rolland, 29200 Brest
          </Para>

          {/* Section 2 */}
          <SectionTitle>2 — Données collectées</SectionTitle>

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            2.1 Données d'identification et de compte
          </h3>
          <BulletList
            items={[
              "Adresse email",
              "Prénom du parent",
              "Mot de passe (stocké sous forme de hash par Supabase Auth — jamais en clair)",
              "Date et version du consentement à la présente politique",
            ]}
          />

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            2.2 Données relatives à l'enfant
          </h3>
          <Para>
            Ces données constituent des données de santé de mineurs au sens de l'article 9 du RGPD
            et bénéficient d'une protection renforcée.
          </Para>
          <BulletList
            items={[
              "Prénom de l'enfant",
              "Date de naissance (optionnel)",
              "Diagnostic ou situation médicale (optionnel, saisi librement par le parent)",
              "Enregistrements vocaux des mémos (supprimés immédiatement après transcription)",
              "Transcriptions des mémos vocaux",
              "Notes et observations structurées",
              "Informations sur les intervenants thérapeutiques (nom, spécialité)",
              "Données d'activités suivies (type, durée, observations)",
              "Lexique phonétique personnalisé",
              "Documents PDF (comptes-rendus médicaux, ordonnances, bilans) — optionnel",
            ]}
          />

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            2.3 Données des membres du village
          </h3>
          <BulletList
            items={[
              "Adresse email (utilisée pour l'invitation)",
              "Rôle au sein du village (coparent, famille)",
              "Date d'acceptation de l'invitation",
            ]}
          />

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            2.4 Données techniques
          </h3>
          <BulletList
            items={[
              "Logs d'utilisation côté Supabase (authentification, accès aux données)",
              "Identifiants techniques (UUID) générés automatiquement",
            ]}
          />

          {/* Section 3 */}
          <SectionTitle>3 — Finalités et bases légales</SectionTitle>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-2 pr-3 font-semibold text-foreground">Finalité</th>
                  <th className="text-left py-2 pr-3 font-semibold text-foreground">Base légale</th>
                  <th className="text-left py-2 font-semibold text-foreground">Durée de conservation</th>
                </tr>
              </thead>
              <tbody className="text-foreground/85">
                <tr className="border-b border-foreground/5">
                  <td className="py-2 pr-3 align-top">Fourniture du service (timeline, mémos, activités)</td>
                  <td className="py-2 pr-3 align-top">Exécution du contrat (art. 6.1.b)</td>
                  <td className="py-2 align-top">Durée du compte + 30 jours après suppression</td>
                </tr>
                <tr className="border-b border-foreground/5">
                  <td className="py-2 pr-3 align-top">Traitement des données de santé de l'enfant</td>
                  <td className="py-2 pr-3 align-top">Consentement explicite (art. 9.2.a)</td>
                  <td className="py-2 align-top">Durée du compte + 30 jours après suppression</td>
                </tr>
                <tr className="border-b border-foreground/5">
                  <td className="py-2 pr-3 align-top">Transcription et structuration des mémos vocaux par IA</td>
                  <td className="py-2 pr-3 align-top">Consentement explicite (art. 9.2.a)</td>
                  <td className="py-2 align-top">
                    Fichier audio : supprimé immédiatement après transcription. Transcription : durée du compte.
                  </td>
                </tr>
                <tr className="border-b border-foreground/5">
                  <td className="py-2 pr-3 align-top">Invitation de membres du village</td>
                  <td className="py-2 pr-3 align-top">Intérêt légitime / exécution du contrat (art. 6.1.f)</td>
                  <td className="py-2 align-top">7 jours pour le token, puis suppression</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 align-top">Amélioration du service (métriques agrégées anonymisées)</td>
                  <td className="py-2 pr-3 align-top">Intérêt légitime (art. 6.1.f)</td>
                  <td className="py-2 align-top">
                    Données agrégées et anonymisées — pas de durée applicable à des personnes identifiables
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4 */}
          <SectionTitle>4 — Traitement par intelligence artificielle et sous-traitants</SectionTitle>

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            4.1 Transcription et structuration des mémos
          </h3>
          <Para>
            Les enregistrements vocaux sont transmis à un service d'intelligence artificielle (Google
            Gemini, via la gateway Lovable AI) pour transcription et structuration. Ce traitement est
            effectué à la volée :
          </Para>
          <BulletList
            items={[
              "Le fichier audio est téléchargé depuis le stockage temporaire",
              "Il est transmis au modèle d'IA pour transcription",
              "Le fichier audio est supprimé immédiatement après transcription",
              "La transcription brute n'est jamais affichée à l'utilisateur",
              "Seul le résumé structuré est présenté dans l'application",
            ]}
          />
          <Para>
            Note : Google Gemini est opéré par Google LLC. REVEL.IA s'assure que ce traitement est
            encadré par des garanties appropriées conformément au RGPD.
          </Para>

          <h3 className="text-base font-semibold text-foreground mt-4 mb-2">
            4.2 Hébergement des données
          </h3>
          <BulletList
            items={[
              "Base de données et authentification : Supabase (AWS Frankfurt — Union Européenne)",
              "Envoi d'emails d'invitation : Resend",
              "Plateforme applicative : Lovable",
            ]}
          />

          {/* Section 5 */}
          <SectionTitle>5 — Vos droits</SectionTitle>
          <Para>Vous disposez des droits suivants sur vos données personnelles :</Para>
          <div className="space-y-2 text-sm leading-relaxed text-foreground/85 mb-3">
            <p>
              <strong>Droit d'accès (art. 15)</strong> : obtenir une copie de vos données.
            </p>
            <p>
              <strong>Droit de rectification (art. 16)</strong> : corriger des données inexactes.
            </p>
            <p>
              <strong>Droit à l'effacement (art. 17)</strong> : demander la suppression de votre
              compte et de vos données. La fonctionnalité de suppression de compte sera disponible
              prochainement dans l'application. En attendant, adressez votre demande à{" "}
              <a href="mailto:contact@the-village.app" className="text-primary hover:underline">
                contact@the-village.app
              </a>{" "}
              — délai de traitement : 30 jours maximum.
            </p>
            <p>
              <strong>Droit à la portabilité (art. 20)</strong> : demander l'export de vos données.
              Disponible prochainement.
            </p>
            <p>
              <strong>Droit d'opposition et de limitation (art. 21-18)</strong> : vous opposer à
              certains traitements ou en demander la limitation.
            </p>
            <p>
              <strong>Droit de retirer le consentement (art. 7.3)</strong> : le retrait ne remet pas
              en cause la licéité du traitement effectué avant le retrait.
            </p>
            <p>
              <strong>Droit de réclamation</strong> : auprès de la CNIL, 3 Place de Fontenoy, 75007
              Paris —{" "}
              <a
                href="https://www.cnil.fr"
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                www.cnil.fr
              </a>
            </p>
          </div>
          <Para>
            Pour exercer vos droits :{" "}
            <a href="mailto:contact@the-village.app" className="text-primary hover:underline">
              contact@the-village.app
            </a>
            <br />
            Délai de réponse : 1 mois maximum (art. 12 RGPD)
          </Para>

          {/* Section 6 */}
          <SectionTitle>6 — Sécurité des données</SectionTitle>
          <Para>REVEL.IA met en œuvre les mesures suivantes :</Para>
          <BulletList
            items={[
              "Chiffrement des données en transit (HTTPS / TLS)",
              "Chiffrement des données au repos (Supabase, hébergé sur AWS Frankfurt)",
              "Contrôle d'accès par rôle (Row Level Security Supabase)",
              "Suppression immédiate des fichiers audio après transcription",
              "Mots de passe stockés sous forme de hash (bcrypt via Supabase Auth)",
              "Tokens d'invitation à usage unique, expirés après 7 jours",
              "Aucune donnée de santé transmise à des tiers à des fins publicitaires",
              "En cas de violation de données, REVEL.IA s'engage à notifier la CNIL dans les 72 heures et les utilisateurs concernés dans les meilleurs délais.",
            ]}
          />

          {/* Section 7 */}
          <SectionTitle>7 — Protection des données des mineurs</SectionTitle>
          <Para>
            The Village est conçu pour aider les parents d'enfants à besoins spécifiques. Les données
            saisies concernent des mineurs. À ce titre :
          </Para>
          <BulletList
            items={[
              "Seuls les titulaires de l'autorité parentale peuvent créer un compte",
              "Le consentement est recueilli auprès du parent, représentant légal de l'enfant",
              "Les données de santé de l'enfant relèvent de l'article 9 RGPD",
              "Ces données ne sont jamais utilisées à des fins de profilage, de scoring ou de comparaison à des normes",
              "L'intelligence artificielle ne pose aucun diagnostic et n'émet aucun pronostic",
            ]}
          />

          {/* Section 8 */}
          <SectionTitle>8 — Cookies et traceurs</SectionTitle>
          <Para>The Village utilise :</Para>
          <BulletList
            items={[
              "Des cookies de session Supabase Auth (nécessaires au fonctionnement — pas de consentement requis)",
              "Aucun cookie publicitaire ou de tracking tiers",
              "Aucune régie publicitaire",
            ]}
          />

          {/* Section 9 */}
          <SectionTitle>9 — Modifications</SectionTitle>
          <Para>
            REVEL.IA se réserve le droit de modifier la présente politique. En cas de modification
            substantielle, les utilisateurs en seront informés par email au moins 30 jours avant
            l'entrée en vigueur des changements.
          </Para>
          <Para>
            La version en vigueur est toujours accessible depuis la page de connexion.
          </Para>

          {/* Section 10 */}
          <SectionTitle>10 — Contact</SectionTitle>
          <Para>
            <a href="mailto:contact@the-village.app" className="text-primary hover:underline">
              contact@the-village.app
            </a>
            <br />
            REVEL.IA — 2 rue Albert Rolland
          </Para>

          <div className="mt-6 pt-4 border-t border-foreground/10">
            <p className="text-xs text-muted-foreground text-center">
              Version en vigueur : Mars 2026 — v1.0
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PolitiqueConfidentialite;
