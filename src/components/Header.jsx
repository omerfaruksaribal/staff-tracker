import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../index.css';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

function Header() {
  const auth = getAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    image: '', // URL of the image in Firebase Storage
  });
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const defaultImageUrl = 'https://via.placeholder.com/256'; // Default image URL

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const storage = getStorage();
        const userImageRef = ref(storage, `images/${user.uid}`);
        
        let imageUrl = defaultImageUrl;
        try {
          // Try to get the download URL of the user's profile image
          imageUrl = await getDownloadURL(userImageRef);
        } catch (error) {
          // Use default image if the user does not have a profile image
          console.log('Profile image not found, using default image.');
        }

        setFormData({
          name: user.displayName || 'User',
          email: user.email,
          image: imageUrl,
        });
        setIsLoggedIn(true);
      } else {
        setFormData({
          name: '',
          email: '',
          image: defaultImageUrl,
        });
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const { name, email, image } = formData;

  const onLogOut = () => {
    auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-full">
      <Disclosure as="nav" className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <button onClick={() => navigate('/')} className='h-8 w-8 text-white'>Staff Tracker</button>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-4">
                  {!isLoggedIn && (
                    <>
                      <button
                        onClick={() => navigate('/login')}
                        className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => navigate('/register')}
                        className="text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                      >
                        Register
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {isLoggedIn && (
              <div className="hidden md:block">
                <div className="ml-4 flex items-center md:ml-6">
                  <button
                    type="button"
                    className="relative rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                  >
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">View notifications</span>
                    <BellIcon aria-hidden="true" className="h-6 w-6" />
                  </button>
  
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <MenuButton className="relative flex max-w-xs items-center rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                        <img alt="Profile" src={image} className="h-8 w-8 rounded-full" />
                      </MenuButton>
                    </div>
                    <MenuItems
                      transition
                      className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
                    >
                      <MenuItem>
                        <button
                          onClick={() => navigate('/profile')}
                          className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                        >
                          Your Profile
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          onClick={onLogOut}
                          className="block px-4 py-2 text-sm text-gray-700 data-[focus]:bg-gray-100"
                        >
                          Log out
                        </button>
                      </MenuItem>
                    </MenuItems>
                  </Menu>
                </div>
              </div>
            )}
            <div className="-mr-2 flex md:hidden">
              <DisclosureButton className="group relative inline-flex items-center justify-center rounded-md bg-gray-800 p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                <span className="absolute -inset-0.5" />
                <span className="sr-only">Open main menu</span>
                <Bars3Icon aria-hidden="true" className="block h-6 w-6 group-data-[open]:hidden" />
                <XMarkIcon aria-hidden="true" className="hidden h-6 w-6 group-data-[open]:block" />
              </DisclosureButton>
            </div>
          </div>
        </div>
  
        <DisclosurePanel className="md:hidden">
          <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
            {!isLoggedIn && (
              <>
                <DisclosureButton
                  as="a"
                  onClick={() => navigate('/login')}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Login
                </DisclosureButton>
                <DisclosureButton
                  as="a"
                  onClick={() => navigate('/register')}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  Register
                </DisclosureButton>
              </>
            )}
          </div>
          {isLoggedIn && (
            <div className="border-t border-gray-700 pb-3 pt-4">
              <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                  <img alt="Profile" src={image} className="h-10 w-10 rounded-full" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium leading-none text-white">{name}</div>
                  <div className="text-sm font-medium leading-none text-gray-400">{email}</div>
                </div>
                <button
                  type="button"
                  className="relative ml-auto flex-shrink-0 rounded-full bg-gray-800 p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">View notifications</span>
                  <BellIcon aria-hidden="true" className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-3 space-y-1 px-2">
                <DisclosureButton
                  as="a"
                  onClick={() => navigate('/profile')}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  Your Profile
                </DisclosureButton>
                <DisclosureButton
                  as="a"
                  onClick={() => {
                    auth.signOut();
                    navigate('/login');
                  }}
                  className="block rounded-md px-3 py-2 text-base font-medium text-gray-400 hover:bg-gray-700 hover:text-white"
                >
                  Log out
                </DisclosureButton>
              </div>
            </div>
          )}
        </DisclosurePanel>
      </Disclosure>
      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Your content goes here */}
        </div>
      </main>
    </div>
  );
}

export default Header;
