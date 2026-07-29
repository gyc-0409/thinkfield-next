export default function BookCard({ book, onOpen }) {
  return (
    <div
      onClick={() => onOpen(book.id)}
      className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition cursor-pointer"
    >
      <h3 className="text-lg font-bold text-gray-800">{book.title}</h3>
      <p className="text-sm text-gray-500">{book.author}</p>
      <p className="text-sm text-blue-500 font-bold mt-1">{book.discussions} 个讨论</p>
    </div>
  );
}