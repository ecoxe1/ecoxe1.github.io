/* Conexão opcional com o Supabase (banco grátis) para receber os formulários de recrutamento e amistoso.
   Enquanto estiver vazio, os formulários geram um texto para a pessoa copiar e mandar no Discord.
   Onde achar: Supabase > Project Settings > API
     url: "Project URL"   key: a chave "publishable" (ou "anon public")
   NUNCA coloque aqui a chave "secret" / "service_role". O passo a passo está no LEIAME.md. */
window.SUPABASE = { url: "", key: "" };
