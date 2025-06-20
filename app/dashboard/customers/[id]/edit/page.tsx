// import Form from '@/app/ui/invoices/edit-form';
// import Breadcrumbs from '@/app/ui/customers/breadcrumbs';
// import { fetchCustomers } from '@/app/lib/data';
// import { notFound } from 'next/navigation';
// import { Metadata } from 'next';
 
// export const metadata: Metadata = {
//   title: 'Edit Customer',
// };

// export default async function Page(props: { params: Promise<{ id: string }> }) {
//     const params = await props.params;
//     const id = params.id;
//     const [customers] = await Promise.all([
//         fetchCustomers(),
//     ]);
//     if (!customers) {
//         notFound();
//     }
//   return (
//     <main>
//       <Breadcrumbs
//         breadcrumbs={[
//           { label: 'Customers', href: '/dashboard/customers' },
//           {
//             label: 'Edit Customer',
//             href: `/dashboard/customer/${id}/edit`,
//             active: true,
//           },
//         ]}
//       />
//       <Form customers={customers} />
//     </main>
//   );
// }