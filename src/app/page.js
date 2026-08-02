import { getHotBooks } from '@/lib/queries/books';
import HomeClient from '@/components/HomeClient';

export default async function HomePage() {
  let initialHotBooks = [];
  let hotBooksError = null;
  try {
    initialHotBooks = await getHotBooks();
  } catch (e) {
    hotBooksError = e.message;
  }
  return <HomeClient initialHotBooks={initialHotBooks} hotBooksError={hotBooksError} />;
}
