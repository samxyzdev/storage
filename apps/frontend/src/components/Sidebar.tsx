export function SideBar() {
  return (
    <div>
      <h1 className="text-2xl">Drive</h1>
      <NewButton />
    </div>
  );
}

export function NewButton() {
  return (
    <button className="flex justify-center items-center py-6 px-4 bg-red-600 text-white w-xs ">
      <p>+</p>
      <p>New</p>
    </button>
  );
}
