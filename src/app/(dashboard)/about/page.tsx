'use client'

import React, { useEffect, useState } from 'react'
import BasicTable from '../basic/page';

function Page() {
  const [users, setUsers] = useState<any[]>([]);

  // Fetch data from API
  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then((response) => response.json())
      .then((data) => setUsers(data))
      .catch((error) => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="p-4">
      <h1>About Page</h1>
      <h2>User List</h2>

      {/* Table to display users */}
      <table className="table-auto border-collapse border border-gray-200 w-full mt-4">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">ID</th>
            <th className="border border-gray-300 px-4 py-2">Name</th>
            <th className="border border-gray-300 px-4 py-2">Username</th>
            <th className="border border-gray-300 px-4 py-2">Email</th>
            <th className="border border-gray-300 px-4 py-2">Phone</th>
            <th className="border border-gray-300 px-4 py-2">Company</th>
          </tr>
        </thead>
        <tbody >
          {/* Map through users and display each user in the table */}
          {users.map((user) => (
            <tr key={user.id}>
              <td className="border border-gray-300 px-4 py-2">{user.id}</td>
              <td className="border border-gray-300 px-4 py-2">{user.name}</td>
              <td className="border border-gray-300 px-4 py-2">{user.username}</td>
              <td className="border border-gray-300 px-4 py-2">{user.email}</td>
              <td className="border border-gray-300 px-4 py-2">{user.phone}</td>
              <td className="border border-gray-300 px-4 py-2">{user.company.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className='mt-5'>
        <BasicTable />
      </div>
    </div>
  );
}

export default Page;
