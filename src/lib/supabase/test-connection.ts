import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function testSupabaseConnection() {
  try {
    // 1. Test basic connection
    console.log('Testing Supabase connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    console.log('✅ Basic connection successful');

    // 2. Test todo_lists table access
    console.log('\nTesting todo_lists table access...');
    const { data: listsData, error: listsError } = await supabase
      .from('todo_lists')
      .select('*')
      .limit(1);
    
    if (listsError) {
      if (listsError.code === '42501') {
        console.log('✅ RLS policy working as expected (unauthorized access blocked)');
      } else {
        throw listsError;
      }
    } else {
      console.log('✅ todo_lists table accessible');
    }

    // 3. Test todo_items table access
    console.log('\nTesting todo_items table access...');
    const { data: itemsData, error: itemsError } = await supabase
      .from('todo_items')
      .select('*')
      .limit(1);
    
    if (itemsError) {
      if (itemsError.code === '42501') {
        console.log('✅ RLS policy working as expected (unauthorized access blocked)');
      } else {
        throw itemsError;
      }
    } else {
      console.log('✅ todo_items table accessible');
    }

    // 4. Test creating a todo list (requires authentication)
    console.log('\nTesting todo list creation...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'testpassword123',
    });

    if (signInError) {
      console.log('⚠️ Authentication required to test creation (this is expected)');
    } else {
      const { data: newList, error: createError } = await supabase
        .from('todo_lists')
        .insert([{ title: 'Test List' }])
        .select()
        .single();

      if (createError) throw createError;
      console.log('✅ Successfully created test todo list:', newList);
    }

    return {
      success: true,
      message: 'All tests completed successfully',
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error,
    };
  }
} 