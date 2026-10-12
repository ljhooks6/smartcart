export const legalVersion = "2026-10-12-beta-v1";
export const legalEffectiveDate = "October 12, 2026";
export function legalPublicationEnabled(env: Record<string,string|undefined> = process.env) { return env.VERCEL_ENV !== "production" || env.LEGAL_PUBLICATION_APPROVED === "true"; }
export const legalDocuments: Record<string,{title:string;paragraphs:string[];sections:{heading:string;paragraphs:string[]}[]}> = {
  "terms": {
    "title": "MealCaddie Terms of Service",
    "paragraphs": [
      "MealCaddie is a product operated by LaDarius Hooks, acting in an individual capacity. Contact: support@mealcaddie.app. Hooks Legacy LLC is the intended future holding company, with registration pending. MealCaddie LLC is the intended future operating subsidiary and has not been formed. Each intended company is not a confirmed operator, registered operator or party to these Terms.",
      "MealCaddie assists with meal planning, recipe suggestions, pantry and grocery organization, and saving recipes. It uses AI, which can produce incomplete, inaccurate or unsuitable results. MealCaddie does not provide diagnosis, treatment, emergency services or medical assurances. Review recommendations before using them. The Dietary Safety Notice explains current restrictions and limitations.",
      "Use accurate information, keep credentials and personal invitation links private, and access only your own data or features you are authorized to use. Public application submission does not create an account, guarantee selection, enroll you in the beta or grant product access. New beta participation requires an approved invitation, the matching verified account and explicit recipient acceptance.",
      "Existing stored Plus accounts, administrator access, the individually reviewed existing Free account and active beta participation are preserved under the reviewed access policy. Pending invitations remain pending until accepted. A Plus designation does not establish that a person pays for a subscription. Temporary beta grants remain separate from stored plans and billing records. Beta expiry or withdrawal does not erase saved content; account/content requests remain available through support.",
      "The beta requires no payment information and creates no paid subscription. Paid checkout and subscription sales are disabled for this beta. Any future paid offering must disclose its price, renewal/cancellation conditions and other purchase terms separately and require appropriate authorization. These Terms do not authorize charges or convert an account to a paid subscription.",
      "Do not attempt to bypass access, plan, invitation or security restrictions; access another person's records; submit malicious content; or use the service unlawfully. Do not put passwords, third-party private information or unnecessary medical information into application answers, planning text or feedback. Restrictions may be applied proportionately to protect users and the service. Where practical, we will explain a restriction and provide a support route; urgent security action may precede notice. A privacy request itself is not misuse.",
      "You retain the rights you have in your submitted content. You permit necessary processing to provide, secure and support the service, handle requests, and use feedback to improve MealCaddie. This does not transfer ownership of your personal data or authorize undisclosed marketing. AI output may resemble other output and is not guaranteed unique or copyrightable. You are responsible for confirming that content you submit may lawfully be used. We will not publish attributable feedback without your permission.",
      "Beta features may fail, change or become unavailable. AI output, ingredient-name review and saved content are not guarantees of food composition, allergy suitability, nutritional accuracy or fitness for a medical condition. Do not remove a genuine dietary restriction to obtain an AI result. These limitations describe the service; they do not waive bodily-injury, negligence, consumer or other rights that cannot lawfully be waived. No mandatory arbitration, class-action waiver, indemnity or monetary liability cap is introduced by these Terms.",
      "Contact support@mealcaddie.app about access, corrections, withdrawal or deletion. Ownership and scope are verified before action. Beta withdrawal, account deletion and marketing withdrawal are different requests. Deletion is reviewed and handled by an administrator; requesting it does not immediately erase an account or cancel or modify billing records.",
      "We will identify material changes and any required fresh agreement rather than fabricate acceptance or rewrite past consent records. If MealCaddie LLC is formed and lawfully assumes operation, we will identify the new operator, publish an effective-date update, explain relevant effects on data and service responsibility, and obtain any consent required by applicable law. Formation alone does not automatically assign these Terms or transfer user records.",
      "The proposed governing law is Texas, United States, subject to any mandatory rights applicable where you live. Contact support@mealcaddie.app for informal resolution; this does not shorten legal time limits or restrict available legal remedies. No exclusive venue is imposed here."
    ],
    "sections": [
      {
        "heading": "Operator and contact",
        "paragraphs": [
          "MealCaddie is a product operated by LaDarius Hooks, acting in an individual capacity. Contact: support@mealcaddie.app. Hooks Legacy LLC is the intended future holding company, with registration pending. MealCaddie LLC is the intended future operating subsidiary and has not been formed. Each intended company is not a confirmed operator, registered operator or party to these Terms."
        ]
      },
      {
        "heading": "What MealCaddie provides",
        "paragraphs": [
          "MealCaddie assists with meal planning, recipe suggestions, pantry and grocery organization, and saving recipes. It uses AI, which can produce incomplete, inaccurate or unsuitable results. MealCaddie does not provide diagnosis, treatment, emergency services or medical assurances. Review recommendations before using them. The Dietary Safety Notice explains current restrictions and limitations."
        ]
      },
      {
        "heading": "Accounts and beta access",
        "paragraphs": [
          "Use accurate information, keep credentials and personal invitation links private, and access only your own data or features you are authorized to use. Public application submission does not create an account, guarantee selection, enroll you in the beta or grant product access. New beta participation requires an approved invitation, the matching verified account and explicit recipient acceptance.",
          "Existing stored Plus accounts, administrator access, the individually reviewed existing Free account and active beta participation are preserved under the reviewed access policy. Pending invitations remain pending until accepted. A Plus designation does not establish that a person pays for a subscription. Temporary beta grants remain separate from stored plans and billing records. Beta expiry or withdrawal does not erase saved content; account/content requests remain available through support.",
          "The beta requires no payment information and creates no paid subscription. Paid checkout and subscription sales are disabled for this beta. Any future paid offering must disclose its price, renewal/cancellation conditions and other purchase terms separately and require appropriate authorization. These Terms do not authorize charges or convert an account to a paid subscription."
        ]
      },
      {
        "heading": "Responsible use",
        "paragraphs": [
          "Do not attempt to bypass access, plan, invitation or security restrictions; access another person's records; submit malicious content; or use the service unlawfully. Do not put passwords, third-party private information or unnecessary medical information into application answers, planning text or feedback. Restrictions may be applied proportionately to protect users and the service. Where practical, we will explain a restriction and provide a support route; urgent security action may precede notice. A privacy request itself is not misuse."
        ]
      },
      {
        "heading": "Your content and feedback",
        "paragraphs": [
          "You retain the rights you have in your submitted content. You permit necessary processing to provide, secure and support the service, handle requests, and use feedback to improve MealCaddie. This does not transfer ownership of your personal data or authorize undisclosed marketing. AI output may resemble other output and is not guaranteed unique or copyrightable. You are responsible for confirming that content you submit may lawfully be used. We will not publish attributable feedback without your permission."
        ]
      },
      {
        "heading": "Reliability and safety",
        "paragraphs": [
          "Beta features may fail, change or become unavailable. AI output, ingredient-name review and saved content are not guarantees of food composition, allergy suitability, nutritional accuracy or fitness for a medical condition. Do not remove a genuine dietary restriction to obtain an AI result. These limitations describe the service; they do not waive bodily-injury, negligence, consumer or other rights that cannot lawfully be waived. No mandatory arbitration, class-action waiver, indemnity or monetary liability cap is introduced by these Terms."
        ]
      },
      {
        "heading": "Requests, changes and future operator",
        "paragraphs": [
          "Contact support@mealcaddie.app about access, corrections, withdrawal or deletion. Ownership and scope are verified before action. Beta withdrawal, account deletion and marketing withdrawal are different requests. Deletion is reviewed and handled by an administrator; requesting it does not immediately erase an account or cancel or modify billing records.",
          "We will identify material changes and any required fresh agreement rather than fabricate acceptance or rewrite past consent records. If MealCaddie LLC is formed and lawfully assumes operation, we will identify the new operator, publish an effective-date update, explain relevant effects on data and service responsibility, and obtain any consent required by applicable law. Formation alone does not automatically assign these Terms or transfer user records."
        ]
      },
      {
        "heading": "Governing law",
        "paragraphs": [
          "The proposed governing law is Texas, United States, subject to any mandatory rights applicable where you live. Contact support@mealcaddie.app for informal resolution; this does not shorten legal time limits or restrict available legal remedies. No exclusive venue is imposed here."
        ]
      }
    ]
  },
  "privacy": {
    "title": "MealCaddie Privacy Policy",
    "paragraphs": [
      "MealCaddie is operated by LaDarius Hooks in an individual capacity. Privacy and support contact: support@mealcaddie.app. Hooks Legacy LLC is the intended holding company, with registration pending; MealCaddie LLC is the intended operating subsidiary and has not been formed. Neither is the current registered operator. Any later operator change will be identified and explained before taking effect, with any consent required by law.",
      "Applications contain email, planning frequency, planning challenges, testing interests, Free/Plus preference, feedback willingness, consent choices and application source/campaign. These support application review and beta organization. Do not include medical details or other unnecessary sensitive information in application answers. Applications do not automatically create an account or add you to the separate Formspree updates list.",
      "Accounts and sign-in use verified identity and account/profile information. Supabase handles authentication; Google supplies identity information when you choose Google sign-in. Invitations, acceptance, participation dates, cohort, temporary privileges and administrative history are recorded to operate secure invitation-only access. We do not ask for payment information for beta participation.",
      "Planning requests may include dietary text, budget, household settings and pantry information. Dietary entries can reveal sensitive health or religious information; provide only what is necessary. Planning settings are retained in the browser, and inputs/results may also persist in generation-job records and saved menus. Pantry and Recipe Vault data persist under owner access controls. It is not accurate to say all dietary information stays on your device.",
      "Security processing includes verification data and rate-limit identifiers derived from a network address. Hosting/security providers may separately process network addresses, request metadata and their own operational logs. Invitations use hashes rather than stored plaintext acceptance tokens.",
      "Feedback contains the category, feature, message and associated participation identity. Optional reporting records minimal successful-planning and feedback counts, not recipe content, ingredients, dietary entries, prompts or device fingerprints. Feedback is available without optional analytics or marketing consent.",
      "We use information to provide and secure MealCaddie, review applicants, operate participation, process requests and improve the service. Required application consent is distinct from optional marketing and optional engagement reporting. Neither optional choice affects selection. The existing general-updates form is separate, uses Formspree, and is not automatically populated by beta applications.",
      "Authorized beta administrators can view applications and feedback. Supabase stores application/account data, Vercel hosts the service, Cloudflare Turnstile provides abuse verification, and Resend delivers separately authorized authentication and beta messages. OpenAI processes dietary/planning inputs when a permitted AI request is made; application answers are not sent to meal-generation AI models. We use these providers to deliver the relevant service, not to publicly disclose your answers. Provider security, logs, backups and retention must be considered separately from our database records.",
      "We do not sell application or dietary information or use it for targeted advertising. We do not use dietary entries to build marketing audiences or engagement telemetry. Contact support to withdraw optional marketing permission. Removing analytics consent stops optional reporting and removes related prior usage records under the implemented participant controls. No automatic marketing or invitation delivery follows application submission.",
      "Under the beta retention policy, unselected applications are eligible for deletion 90 days after recruitment closure is recorded; selected applications, feedback and aggregate reports 90 days after beta end is recorded. Withdrawn applications become eligible after five days, with a seven-day removal target and monitored follow-up. Automated daily cleanup is disabled. Administrators review due records daily and handle removal within the applicable schedule after verifying identity, scope and any documented legal obligation. Linked invitation, participation and application-history records are removed with an application; feedback/reporting may therefore be removed earlier after withdrawal.",
      "Raw optional engagement events are eligible after 30 days, and abuse counters generally expire after 48 hours and are removed in cleanup. Minimal program audit events are eligible after 180 days, while application-linked histories follow their application's earlier removal. These periods do not mean every record must be held for that entire interval.",
      "The daily automated schedule is disabled. Recruitment close and beta end are manually recorded; the participation end boundary does not automatically start all retention timers. Existing beta cleanup does not delete your account, stored plan, saved menus, pantry or Recipe Vault content.",
      "Account and planning content remain for service use until the applicable verified deletion/retention process is completed. Export/account deletion, controlled test-email evidence, agreement/privacy-request evidence and provider/support records require administrator handling; they have no new automatic purge in this policy. Planning-job records currently have no automatic deletion schedule and may include retained inputs and results until a verified deletion request is handled. Provider logs/backups follow the provider terms and configured controls; they are not erased immediately with a database record. Support requests are reviewed manually. We review the necessity of these records regularly and explain any applicable retention limitation when handling a request rather than promise a uniform provider deletion period. Controlled email-test records follow a 90-day post-test manual review/removal schedule. Privacy-request evidence is retained 90 days after resolution unless a documented legal obligation requires otherwise. Agreement evidence is kept only while reasonably necessary for account/participation administration or justified post-deletion recordkeeping, with necessity reviewed when the account/participation ends. Requests and confirmed deletions are tracked so restored data can be reconciled before service resumes.",
      "Contact support@mealcaddie.app to request access/export, correction, deletion, withdrawal or a review of a request decision. State what you want changed; do not send passwords, login links or unnecessary identity documents. We verify ownership using reasonable information and explain any necessary additional verification. Requests are handled manually, within applicable deadlines; export/deletion are not instant self-service operations. If a request is refused, we will explain the decision and provide a review route. Where applicable, the response will explain further complaint or appeal options.",
      "Participation withdrawal removes temporary beta privileges and optional reporting; it does not itself delete your account or saved recipes. Application withdrawal and marketing withdrawal do not automatically delete an account. An account deletion request is not authorization to alter someone else's records. Applicable rights are not waived by these notices.",
      "We use ownership controls, verified identities, invitation hashes and restricted administrator access. No system can guarantee security. Material changes to purposes, consent or operator identity will be disclosed, with fresh consent when required. Prior notices/consent histories are preserved rather than silently rewritten. Contact support@mealcaddie.app about privacy or security concerns."
    ],
    "sections": [
      {
        "heading": "Who is responsible",
        "paragraphs": [
          "MealCaddie is operated by LaDarius Hooks in an individual capacity. Privacy and support contact: support@mealcaddie.app. Hooks Legacy LLC is the intended holding company, with registration pending; MealCaddie LLC is the intended operating subsidiary and has not been formed. Neither is the current registered operator. Any later operator change will be identified and explained before taking effect, with any consent required by law."
        ]
      },
      {
        "heading": "Information we process",
        "paragraphs": [
          "Applications contain email, planning frequency, planning challenges, testing interests, Free/Plus preference, feedback willingness, consent choices and application source/campaign. These support application review and beta organization. Do not include medical details or other unnecessary sensitive information in application answers. Applications do not automatically create an account or add you to the separate Formspree updates list.",
          "Accounts and sign-in use verified identity and account/profile information. Supabase handles authentication; Google supplies identity information when you choose Google sign-in. Invitations, acceptance, participation dates, cohort, temporary privileges and administrative history are recorded to operate secure invitation-only access. We do not ask for payment information for beta participation.",
          "Planning requests may include dietary text, budget, household settings and pantry information. Dietary entries can reveal sensitive health or religious information; provide only what is necessary. Planning settings are retained in the browser, and inputs/results may also persist in generation-job records and saved menus. Pantry and Recipe Vault data persist under owner access controls. It is not accurate to say all dietary information stays on your device.",
          "Security processing includes verification data and rate-limit identifiers derived from a network address. Hosting/security providers may separately process network addresses, request metadata and their own operational logs. Invitations use hashes rather than stored plaintext acceptance tokens.",
          "Feedback contains the category, feature, message and associated participation identity. Optional reporting records minimal successful-planning and feedback counts, not recipe content, ingredients, dietary entries, prompts or device fingerprints. Feedback is available without optional analytics or marketing consent."
        ]
      },
      {
        "heading": "Purposes, consent and providers",
        "paragraphs": [
          "We use information to provide and secure MealCaddie, review applicants, operate participation, process requests and improve the service. Required application consent is distinct from optional marketing and optional engagement reporting. Neither optional choice affects selection. The existing general-updates form is separate, uses Formspree, and is not automatically populated by beta applications.",
          "Authorized beta administrators can view applications and feedback. Supabase stores application/account data, Vercel hosts the service, Cloudflare Turnstile provides abuse verification, and Resend delivers separately authorized authentication and beta messages. OpenAI processes dietary/planning inputs when a permitted AI request is made; application answers are not sent to meal-generation AI models. We use these providers to deliver the relevant service, not to publicly disclose your answers. Provider security, logs, backups and retention must be considered separately from our database records.",
          "We do not sell application or dietary information or use it for targeted advertising. We do not use dietary entries to build marketing audiences or engagement telemetry. Contact support to withdraw optional marketing permission. Removing analytics consent stops optional reporting and removes related prior usage records under the implemented participant controls. No automatic marketing or invitation delivery follows application submission."
        ]
      },
      {
        "heading": "Retention",
        "paragraphs": [
          "Under the beta retention policy, unselected applications are eligible for deletion 90 days after recruitment closure is recorded; selected applications, feedback and aggregate reports 90 days after beta end is recorded. Withdrawn applications become eligible after five days, with a seven-day removal target and monitored follow-up. Automated daily cleanup is disabled. Administrators review due records daily and handle removal within the applicable schedule after verifying identity, scope and any documented legal obligation. Linked invitation, participation and application-history records are removed with an application; feedback/reporting may therefore be removed earlier after withdrawal.",
          "Raw optional engagement events are eligible after 30 days, and abuse counters generally expire after 48 hours and are removed in cleanup. Minimal program audit events are eligible after 180 days, while application-linked histories follow their application's earlier removal. These periods do not mean every record must be held for that entire interval.",
          "The daily automated schedule is disabled. Recruitment close and beta end are manually recorded; the participation end boundary does not automatically start all retention timers. Existing beta cleanup does not delete your account, stored plan, saved menus, pantry or Recipe Vault content.",
          "Account and planning content remain for service use until the applicable verified deletion/retention process is completed. Export/account deletion, controlled test-email evidence, agreement/privacy-request evidence and provider/support records require administrator handling; they have no new automatic purge in this policy. Planning-job records currently have no automatic deletion schedule and may include retained inputs and results until a verified deletion request is handled. Provider logs/backups follow the provider terms and configured controls; they are not erased immediately with a database record. Support requests are reviewed manually. We review the necessity of these records regularly and explain any applicable retention limitation when handling a request rather than promise a uniform provider deletion period. Controlled email-test records follow a 90-day post-test manual review/removal schedule. Privacy-request evidence is retained 90 days after resolution unless a documented legal obligation requires otherwise. Agreement evidence is kept only while reasonably necessary for account/participation administration or justified post-deletion recordkeeping, with necessity reviewed when the account/participation ends. Requests and confirmed deletions are tracked so restored data can be reconciled before service resumes."
        ]
      },
      {
        "heading": "Requests and your choices",
        "paragraphs": [
          "Contact support@mealcaddie.app to request access/export, correction, deletion, withdrawal or a review of a request decision. State what you want changed; do not send passwords, login links or unnecessary identity documents. We verify ownership using reasonable information and explain any necessary additional verification. Requests are handled manually, within applicable deadlines; export/deletion are not instant self-service operations. If a request is refused, we will explain the decision and provide a review route. Where applicable, the response will explain further complaint or appeal options.",
          "Participation withdrawal removes temporary beta privileges and optional reporting; it does not itself delete your account or saved recipes. Application withdrawal and marketing withdrawal do not automatically delete an account. An account deletion request is not authorization to alter someone else's records. Applicable rights are not waived by these notices."
        ]
      },
      {
        "heading": "Security and updates",
        "paragraphs": [
          "We use ownership controls, verified identities, invitation hashes and restricted administrator access. No system can guarantee security. Material changes to purposes, consent or operator identity will be disclosed, with fresh consent when required. Prior notices/consent histories are preserved rather than silently rewritten. Contact support@mealcaddie.app about privacy or security concerns."
        ]
      }
    ]
  },
  "safety": {
    "title": "MealCaddie Dietary Safety Notice",
    "paragraphs": [
      "MealCaddie is operated by LaDarius Hooks in an individual capacity. Contact support@mealcaddie.app. Hooks Legacy LLC registration is pending and MealCaddie LLC has not been formed; neither is identified as the existing operator.",
      "Allergy-dependent, free-from, intolerance-related and unverified dietary AI generation is temporarily refused before provider calls. Recognized or ambiguous restriction text is rejected before AI provider calls. AI ingredient rewriting is also restricted. Keep genuine restrictions entered; do not remove or disguise them to obtain a result. Ordinary permitted preferences do not establish allergy suitability.",
      "AI recipes and limited ingredient-name checks cannot verify every ingredient's composition, compound product, substitution or preparation condition. A meal title, plant-based/gluten-free label, pantry entry or old saved recipe does not establish that a food is safe for an allergy or medical condition. Structured dietary selections and Preview warnings do not override the server restriction or certify safety. No recommendation is guaranteed allergen-free, medically suitable or nutritionally accurate.",
      "Check package ingredients, manufacturer information, advisory warnings, substitutions and cross-contact conditions whenever you shop or prepare food. Recheck saved recipes and grocery lists when your needs, brands or preparation choices change. Do not eat food whose suitability is uncertain.",
      "MealCaddie does not diagnose, treat, assess allergy severity or replace qualified medical/nutritional care. Seek qualified guidance for medical dietary needs and use emergency services for an emergency. Application, feedback and planning fields are not channels for urgent care or detailed medical histories.",
      "Existing saved recipes, menus and shopping lists remain available according to access permissions but have not been certified allergy-safe. Independent review remains necessary even when a displayed ingredient check reports no conflict.",
      "This notice informs you about limitations. It does not waive bodily-injury, negligence or other legally protected claims. A future acknowledgment must be genuinely affirmative; no earlier acceptance is invented or backdated."
    ],
    "sections": [
      {
        "heading": "",
        "paragraphs": [
          "MealCaddie is operated by LaDarius Hooks in an individual capacity. Contact support@mealcaddie.app. Hooks Legacy LLC registration is pending and MealCaddie LLC has not been formed; neither is identified as the existing operator."
        ]
      },
      {
        "heading": "Current restrictions",
        "paragraphs": [
          "Allergy-dependent, free-from, intolerance-related and unverified dietary AI generation is temporarily refused before provider calls. Recognized or ambiguous restriction text is rejected before AI provider calls. AI ingredient rewriting is also restricted. Keep genuine restrictions entered; do not remove or disguise them to obtain a result. Ordinary permitted preferences do not establish allergy suitability."
        ]
      },
      {
        "heading": "No guarantee of suitability",
        "paragraphs": [
          "AI recipes and limited ingredient-name checks cannot verify every ingredient's composition, compound product, substitution or preparation condition. A meal title, plant-based/gluten-free label, pantry entry or old saved recipe does not establish that a food is safe for an allergy or medical condition. Structured dietary selections and Preview warnings do not override the server restriction or certify safety. No recommendation is guaranteed allergen-free, medically suitable or nutritionally accurate.",
          "Check package ingredients, manufacturer information, advisory warnings, substitutions and cross-contact conditions whenever you shop or prepare food. Recheck saved recipes and grocery lists when your needs, brands or preparation choices change. Do not eat food whose suitability is uncertain."
        ]
      },
      {
        "heading": "Medical care and saved content",
        "paragraphs": [
          "MealCaddie does not diagnose, treat, assess allergy severity or replace qualified medical/nutritional care. Seek qualified guidance for medical dietary needs and use emergency services for an emergency. Application, feedback and planning fields are not channels for urgent care or detailed medical histories.",
          "Existing saved recipes, menus and shopping lists remain available according to access permissions but have not been certified allergy-safe. Independent review remains necessary even when a displayed ingredient check reports no conflict.",
          "This notice informs you about limitations. It does not waive bodily-injury, negligence or other legally protected claims. A future acknowledgment must be genuinely affirmative; no earlier acceptance is invented or backdated."
        ]
      }
    ]
  },
  "beta": {
    "title": "MealCaddie Beta Participation Agreement",
    "paragraphs": [
      "MealCaddie is operated by LaDarius Hooks in an individual capacity. Privacy/support contact: support@mealcaddie.app; beta contact: beta@mealcaddie.app. Hooks Legacy LLC is the intended holding company with registration pending. MealCaddie LLC is the intended operating subsidiary and has not been formed. Neither is an existing registered beta operator.",
      "The beta tests meal-planning, cooking, grocery, pantry and recipe-saving experiences. It is temporary development software, may change or fail, and is subject to the Terms of Service, Privacy Policy and Dietary Safety Notice as separately approved and genuinely accepted where required. This document does not retroactively replace an earlier consent or invent acceptance.",
      "Applications are public, but participation is invitation-only. Applying does not guarantee selection, create an account, enroll you, give app access or determine your cohort. Administrators make selection and Free/temporary Plus assignments. No payment information is required and no subscription is created.",
      "A personal invitation expires seven days after issuance and can be accepted only once. Open it, authenticate as the matching verified MealCaddie account, return to the invitation page, review the participation notice and explicitly accept. Do not share a personal acceptance link. Receiving an email does not activate privileges. Existing accounts may sign in and reopen their invitation to finish acceptance.",
      "Resends require administrator approval, a 24-hour cooldown and no more than three resends in a rolling seven days. This is a limit, not a promise of an automatic resend. No bulk or automatic invitation delivery is activated here.",
      "Participation ordinarily lasts 30 days from activation and ends no later than December 31, 2026, at 11:59 PM Central Time (January 1, 2027, 05:59 UTC), under the current program boundary. Administrators may extend participation only within separately configured boundaries. A Free-to-Plus promotion preserves the original expiration unless an extension is separately authorized.",
      "A Free participant receives no temporary Plus grant. Temporary Plus does not change an underlying stored Free plan, require payment or create a Stripe subscription. It expires or ends upon revocation/withdrawal and must not authorize new Plus-only work afterward. Queued Plus-only work rechecks permissions before execution; denied work stops safely without deleting saved content.",
      "Because Preview and production share the beta database, a temporary grant may affect feature permissions in both environments. Existing stored Plus/admin privileges and the individually preserved existing Free account remain separate and are not automatically downgraded, charged or revoked. Stored Plus alone is not evidence of a paid subscription.",
      "You may report bugs, suggestions and usability feedback without consenting to optional analytics or marketing. Do not include credentials, login links, medical details or another person's private information. Administrators may use feedback to improve MealCaddie; attributable feedback is not published without permission.",
      "Optional engagement reporting uses minimal counts, not meal contents or dietary information. Participation settings let you turn it off and remove associated reports. Withdrawal revokes temporary privileges and stops optional reporting without deleting your account or saved content. Contact support for application withdrawal, access, corrections or deletion; participant controls may also provide withdrawal when enabled.",
      "Beta-record retention follows the separately approved Privacy Policy and execution procedure. Public applications do not automatically subscribe applicants to the independent Formspree updates list or trigger email.",
      "Participation may expire, be withdrawn or be revoked proportionately for program or security reasons. We will provide an explanation and support route where practical, while allowing urgent security action when needed. Existing content is not deleted as punishment for expiry or withdrawal. The beta is not a medical service or an assurance of food safety. No injury waiver, mandatory arbitration or fabricated terms acceptance is introduced.",
      "The proposed governing jurisdiction is Texas, United States, subject to applicable mandatory rights. If MealCaddie LLC later forms and properly assumes service operation, the operator and agreements will be updated with notice and any legally required consent; that change is not automatic merely because a company is formed."
    ],
    "sections": [
      {
        "heading": "Operator and purpose",
        "paragraphs": [
          "MealCaddie is operated by LaDarius Hooks in an individual capacity. Privacy/support contact: support@mealcaddie.app; beta contact: beta@mealcaddie.app. Hooks Legacy LLC is the intended holding company with registration pending. MealCaddie LLC is the intended operating subsidiary and has not been formed. Neither is an existing registered beta operator.",
          "The beta tests meal-planning, cooking, grocery, pantry and recipe-saving experiences. It is temporary development software, may change or fail, and is subject to the Terms of Service, Privacy Policy and Dietary Safety Notice as separately approved and genuinely accepted where required. This document does not retroactively replace an earlier consent or invent acceptance."
        ]
      },
      {
        "heading": "Applying and accepting",
        "paragraphs": [
          "Applications are public, but participation is invitation-only. Applying does not guarantee selection, create an account, enroll you, give app access or determine your cohort. Administrators make selection and Free/temporary Plus assignments. No payment information is required and no subscription is created.",
          "A personal invitation expires seven days after issuance and can be accepted only once. Open it, authenticate as the matching verified MealCaddie account, return to the invitation page, review the participation notice and explicitly accept. Do not share a personal acceptance link. Receiving an email does not activate privileges. Existing accounts may sign in and reopen their invitation to finish acceptance.",
          "Resends require administrator approval, a 24-hour cooldown and no more than three resends in a rolling seven days. This is a limit, not a promise of an automatic resend. No bulk or automatic invitation delivery is activated here."
        ]
      },
      {
        "heading": "Participation and temporary Plus",
        "paragraphs": [
          "Participation ordinarily lasts 30 days from activation and ends no later than December 31, 2026, at 11:59 PM Central Time (January 1, 2027, 05:59 UTC), under the current program boundary. Administrators may extend participation only within separately configured boundaries. A Free-to-Plus promotion preserves the original expiration unless an extension is separately authorized.",
          "A Free participant receives no temporary Plus grant. Temporary Plus does not change an underlying stored Free plan, require payment or create a Stripe subscription. It expires or ends upon revocation/withdrawal and must not authorize new Plus-only work afterward. Queued Plus-only work rechecks permissions before execution; denied work stops safely without deleting saved content.",
          "Because Preview and production share the beta database, a temporary grant may affect feature permissions in both environments. Existing stored Plus/admin privileges and the individually preserved existing Free account remain separate and are not automatically downgraded, charged or revoked. Stored Plus alone is not evidence of a paid subscription."
        ]
      },
      {
        "heading": "Feedback, reporting and withdrawal",
        "paragraphs": [
          "You may report bugs, suggestions and usability feedback without consenting to optional analytics or marketing. Do not include credentials, login links, medical details or another person's private information. Administrators may use feedback to improve MealCaddie; attributable feedback is not published without permission.",
          "Optional engagement reporting uses minimal counts, not meal contents or dietary information. Participation settings let you turn it off and remove associated reports. Withdrawal revokes temporary privileges and stops optional reporting without deleting your account or saved content. Contact support for application withdrawal, access, corrections or deletion; participant controls may also provide withdrawal when enabled.",
          "Beta-record retention follows the separately approved Privacy Policy and execution procedure. Public applications do not automatically subscribe applicants to the independent Formspree updates list or trigger email."
        ]
      },
      {
        "heading": "Changes, restrictions and rights",
        "paragraphs": [
          "Participation may expire, be withdrawn or be revoked proportionately for program or security reasons. We will provide an explanation and support route where practical, while allowing urgent security action when needed. Existing content is not deleted as punishment for expiry or withdrawal. The beta is not a medical service or an assurance of food safety. No injury waiver, mandatory arbitration or fabricated terms acceptance is introduced.",
          "The proposed governing jurisdiction is Texas, United States, subject to applicable mandatory rights. If MealCaddie LLC later forms and properly assumes service operation, the operator and agreements will be updated with notice and any legally required consent; that change is not automatic merely because a company is formed."
        ]
      }
    ]
  }
};
