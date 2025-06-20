'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });


export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
  date: z.string(),
})

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  // Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  
 try{
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
 }
catch (error) {
    // If a database error occurs, return a more specific error.
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// ...
 
export async function updateInvoice( 
   id: string,
   prevState: State ,
   formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
 // If form validation fails, return errors early. Otherwise, continue.
 if (!validatedFields.success) {
  return {
    errors: validatedFields.error.flatten().fieldErrors,
    message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
// Prepare data for insertion into the database
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  try{
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
    `;
  }
  catch (error) {
    { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  try {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  }
  catch {
    throw new Error('Failed to Delete Invoice');
  }
  revalidatePath('/dashboard/invoices');
  
}

/**
 * Customer form schema with validation rules:
 * - `id`: Auto-generated string
 * - `name`: Required string (min 1 char)
 * - `email`: Valid email format
 * - `image_url`: Optional URL (must be valid if provided)
 */
const CustomerFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'Name is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  image_url: z.string().url().optional(), // Optional profile image
});

// For CREATE: Exclude auto-generated 'id'
const CreateCustomer = CustomerFormSchema.omit({ id: true });

// For UPDATE: Exclude 'id' (passed separately)
const UpdateCustomer = CustomerFormSchema.omit({ id: true });

/**
 * Shape of the state object returned by customer actions:
 * - `errors`: Field-specific validation errors (name/email/image_url)
 * - `message`: General error message (e.g., database failures)
 */
export type CustomerState = {
  errors?: {
    name?: string[];
    email?: string[];
    image_url?: string[];
  };
  message?: string | null;
};

/**
 * Creates a new customer in the database.
 * Steps:
 * 1. Validates form data (name, email, image_url)
 * 2. Inserts into PostgreSQL via `sql`
 * 3. Revalidates cache and redirects on success
 * 
 * @param prevState - Previous form state (for error handling)
 * @param formData - Form data from the submission
 * @returns State with errors or success redirect
 */
export async function createCustomer(prevState: CustomerState, formData: FormData) {
  // Validate form fields
  const validatedFields = CreateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  // Return early if invalid
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create customer.',
    };
  }

  // Extract validated data
  const { name, email, image_url } = validatedFields.data;

  try {
    // Insert into database
    await sql`
      INSERT INTO customers (name, email, image_url)
      VALUES (${name}, ${email}, ${image_url ?? null})
    `;
  } catch (error) {
    return { message: 'Database error: Failed to create customer.' };
  }

  // Refresh cache and redirect
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

/**
 * Updates an existing customer by ID.
 * Steps:
 * 1. Validates form data
 * 2. Updates record in PostgreSQL
 * 3. Revalidates cache and redirects
 * 
 * @param id - Customer ID to update
 * @param formData - Updated fields (name/email/image_url)
 */
export async function updateCustomer(
  id: string,
  prevState: CustomerState,
  formData: FormData
) {
  // Validate form fields (same as create)
  const validatedFields = UpdateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    image_url: formData.get('image_url'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to update customer.',
    };
  }

  const { name, email, image_url } = validatedFields.data;

  try {
    // Update database record
    await sql`
      UPDATE customers
      SET 
        name = ${name},
        email = ${email},
        image_url = ${image_url ?? null}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database error: Failed to update customer.' };
  }

  // Refresh and redirect
  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

/**
 * Deletes a customer by ID.
 * - Handles referential integrity (ensure no linked invoices exist)
 * - Revalidates cache after deletion
 * 
 * @param id - Customer ID to delete
 * @throws Error if deletion fails
 */
export async function deleteCustomer(id: string) {
  try {
    await sql`DELETE FROM customers WHERE id = ${id}`;
  } catch (error) {
    throw new Error('Failed to delete customer (check for linked invoices).');
  }
  revalidatePath('/dashboard/customers');
}