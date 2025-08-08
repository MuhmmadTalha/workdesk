console.log('Starting database test...')

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://yxtedbqbpkbmhjxcbrxs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dGVkYnFicGtibWhqeGNicnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjQ3MjksImV4cCI6MjA3MDA0MDcyOX0.bzLwCfnIPgsjtewUJ0mRzII0I8IBsCtF6dL1LrZbbO8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    const { data, error } = await supabase
      .from('employees')
      .select('id, email, name, role, is_verified')
      .limit(10)
    
    if (error) {
      console.error('❌ Database error:', error)
      return
    }
    
    console.log('✅ Database connected successfully!')
    console.log('📊 Available users:')
    console.table(data)
    
    // Test specific admin user
    const { data: admin, error: adminError } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'admin@company.com')
      .single()
      
    if (adminError) {
      console.log('❌ Admin user error:', adminError)
    } else {
      console.log('✅ Admin user found:', admin)
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err)
  }
}

testDatabase()
