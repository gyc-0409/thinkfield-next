import { getBooksByType } from '@/lib/queries/books';
import CategoryClient from '@/components/CategoryClient';

export default async function CategoryPage({ params }) {
  const { type } = await params;
  let initialBooks = [];
  let loadError = null;
  try {
    initialBooks = await getBooksByType(type);
  } catch (e) {
    loadError = e.message;
  }
  return <CategoryClient type={type} initialBooks={initialBooks} loadError={loadError} />;
}
