import picture from "../assets/profile-photo.png";

export function Header() {
  return (
    <div className="flex justify-between pt-2 flex-1">
      <SearchBar />
      <Profile />
    </div>
  );
}

function SearchBar() {
  return (
    <div className="borser bg-red-50 w-2xl rounded-4xl flex justify-center items-center px-4 py-2 gap-2 h-14">
      <div className="text-bold text-black">Search</div>
      <input
        className="w-full h-full p-3 border-none outline-none focus:outline-none"
        type="text"
        placeholder="Get asnwers from Drive"
      />
    </div>
  );
}

function Profile() {
  return (
    <div>
      <img
        id="avatarButton"
        itemType="button"
        data-dropdown-toggle="userDropdown"
        data-dropdown-placement="bottom-start"
        className="w-10 h-10 rounded-full cursor-pointer"
        src={picture}
        alt="User dropdown"
      />

      <div
        id="userDropdown"
        className="z-10 hidden bg-neutral-primary-medium border border-default-medium rounded-base shadow-lg w-44"
      >
        <div className="px-4 py-3 border-b border-default-medium text-sm text-heading">
          <div className="font-medium">Bonnie Green</div>
          <div className="truncate">name@flowbite.com</div>
        </div>
        z
        <ul
          className="p-2 text-sm text-body font-medium"
          aria-labelledby="avatarButton"
        >
          <li>
            <a
              href="#"
              className="block w-full p-2 hover:bg-neutral-tertiary-medium hover:text-heading rounded-md"
            >
              Dashboard
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block w-full p-2 hover:bg-neutral-tertiary-medium hover:text-heading rounded-md"
            >
              Settings
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block w-full p-2 hover:bg-neutral-tertiary-medium hover:text-heading rounded-md"
            >
              Earnings
            </a>
          </li>
          <li>
            <a
              href="#"
              className="block w-full p-2 hover:bg-neutral-tertiary-medium text-fg-danger rounded-md"
            >
              Sign out
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
