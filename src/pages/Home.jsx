import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';

function Home() {
  const db = getFirestore();

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
    };

    fetchUsers();
  }, [db]);

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-20 px-6 lg:px-8 xl:grid-cols-3">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">X Tech</h2>
          <h3 className="mt-6 text-lg leading-8 text-gray-600">
            Our Team Members:
          </h3>
        </div>
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 sm:gap-y-16 xl:col-span-2">
          {users.map((user) => (
            <li key={user.id}>
              <div className="flex items-center gap-x-6">
                <div>
                  <Link to={`/profile/${user.id}`}>
                  <img
                    alt={user.name}
                    src={user.image}
                    className="h-24 w-24 rounded-full mx-auto"
                  />
                  </Link>
                  <Link to={`/profile/${user.id}`}>
                    <h3 className="text-base font-semibold leading-7 tracking-tight text-gray-900">Name: {user.name}</h3>
                  </Link>
                  <h3 className="text-base leading-7 tracking-tight text-gray-900">Email: {user.email}</h3>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Home;
