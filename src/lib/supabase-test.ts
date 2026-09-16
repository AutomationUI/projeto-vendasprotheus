import { supabase } from './supabase';

/**
 * Utility functions to test Row Level Security (RLS) policies
 * These functions simulate operations to verify tenant isolation.
 */

// Define a test customer payload
const testCustomerPayload = {
    name: 'Test Customer RLS',
};

// Define a test order payload
const testOrderPayload = {
    total: 99.99,
};

export const runRlsTests = async () => {
    console.log('--- Starting RLS Tests ---');

    try {
        // 1. Verify User Session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
            console.error('RLS Test Error: No active session. Please login first.', sessionError);
            return false;
        }

        const userTenantId = session.user.app_metadata?.tenant_id;
        
        if (!userTenantId) {
             console.error('RLS Test Error: User does not have a tenant_id in app_metadata. Check auth configuration.');
             return false;
        }
        console.log(`Current User Tenant ID: ${userTenantId}`);


        // 2. Test Customer Table RLS
        console.log('\nTesting Customers Table RLS...');
        
        // Attempt to insert a customer (tenant_id should be auto-populated by the DB trigger)
        console.log('Attempting to insert a customer...');
        const { data: insertedCustomer, error: insertCustomerError } = await supabase
            .from('customers')
            .insert(testCustomerPayload)
            .select()
            .single();

        if (insertCustomerError) {
             console.error('Failed to insert customer:', insertCustomerError.message);
        } else {
             console.log('Successfully inserted customer:', insertedCustomer);
             
             // Verify the auto-populated tenant_id matches the user's tenant_id
             if (insertedCustomer.tenant_id === userTenantId) {
                  console.log('✅ Trigger successfully populated correct tenant_id on insert.');
             } else {
                  console.error(`❌ Mismatch! Inserted tenant_id (${insertedCustomer.tenant_id}) does not match user tenant_id (${userTenantId})`);
             }
        }

        // Attempt to select customers. We should only see customers for our tenant.
        console.log('Attempting to fetch customers...');
        const { data: fetchedCustomers, error: fetchCustomersError } = await supabase
             .from('customers')
             .select('*');

        if (fetchCustomersError) {
             console.error('Failed to fetch customers:', fetchCustomersError.message);
        } else {
             console.log(`Successfully fetched ${fetchedCustomers.length} customers.`);
             
             // Verify all fetched customers belong to the current tenant
             const allMatch = fetchedCustomers.every(c => c.tenant_id === userTenantId);
             if (allMatch) {
                 console.log('✅ RLS SELECT policy is working: Only fetched customers for current tenant.');
             } else {
                 console.error('❌ RLS SELECT policy failed: Fetched customers belonging to other tenants!');
             }
        }


        // 3. Test Orders Table RLS
        console.log('\nTesting Orders Table RLS...');
        
        // Attempt to insert an order (tenant_id should be auto-populated)
         console.log('Attempting to insert an order...');
         // We'll link it to the customer we just created if it exists
         const orderData = insertedCustomer 
             ? { ...testOrderPayload, customer_id: insertedCustomer.id } 
             : testOrderPayload;

         const { data: insertedOrder, error: insertOrderError } = await supabase
             .from('orders')
             .insert(orderData)
             .select()
             .single();
 
         if (insertOrderError) {
              console.error('Failed to insert order:', insertOrderError.message);
         } else {
              console.log('Successfully inserted order:', insertedOrder);
              
              if (insertedOrder.tenant_id === userTenantId) {
                   console.log('✅ Trigger successfully populated correct tenant_id on insert.');
              } else {
                   console.error(`❌ Mismatch! Inserted tenant_id (${insertedOrder.tenant_id}) does not match user tenant_id (${userTenantId})`);
              }
         }
 
         // Attempt to select orders
         console.log('Attempting to fetch orders...');
         const { data: fetchedOrders, error: fetchOrdersError } = await supabase
              .from('orders')
              .select('*');
 
         if (fetchOrdersError) {
              console.error('Failed to fetch orders:', fetchOrdersError.message);
         } else {
              console.log(`Successfully fetched ${fetchedOrders.length} orders.`);
              
              const allMatch = fetchedOrders.every(o => o.tenant_id === userTenantId);
              if (allMatch) {
                  console.log('✅ RLS SELECT policy is working: Only fetched orders for current tenant.');
              } else {
                  console.error('❌ RLS SELECT policy failed: Fetched orders belonging to other tenants!');
              }
         }

        console.log('\n--- RLS Tests Completed ---');
        return true;

    } catch (e) {
        console.error('Unexpected error during RLS tests:', e);
        return false;
    }
};
