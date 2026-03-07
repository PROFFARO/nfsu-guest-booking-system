import fetch from 'node-fetch';

async function testCRUD() {
    console.log("Fetching rooms...");
    const res = await fetch('http://localhost:5000/api/rooms');
    const data = await res.json();
    console.log("Rooms count:", data.data?.rooms?.length);
    console.log("First room:", data.data?.rooms?.[0]?.roomNumber);
}

testCRUD();
