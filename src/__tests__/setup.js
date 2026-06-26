// Garantiza variables mínimas para que supabase.js no falle al importar.
// No sobreescribe valores reales si ya existen (CI o .env local con datos reales).
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co'
process.env.SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || 'placeholder-service-role'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'placeholder-jwt-secret'
process.env.PORT = process.env.PORT || '3002'
