// Simple script to test database operations
// Run this in browser console to test if database is working

const testDatabaseOperations = async () => {
  console.log('🔍 Testing database operations...')
  
  // Test basic connection
  try {
    const response = await fetch('/api/test-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'connection' })
    })
    
    if (response.ok) {
      console.log('✅ Database connection working')
    } else {
      console.error('❌ Database connection failed')
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error)
  }
  
  // Test if user is logged in
  const userStr = localStorage.getItem('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    console.log('✅ User logged in:', user)
  } else {
    console.error('❌ No user logged in')
  }
  
  // Test Supabase client
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { data, error } = await supabase
      .from('employees')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Supabase test failed:', error)
    } else {
      console.log('✅ Supabase working:', data)
    }
  } catch (error) {
    console.error('❌ Supabase import failed:', error)
  }
}

// Run the test
testDatabaseOperations()
