// פונקציות API למשימות
const API_URL = 'http://localhost:3001/api/tasks';

export async function fetchTasks() {
	const res = await fetch(API_URL);
	if (!res.ok) throw new Error('שגיאה בשליפת משימות');
	return await res.json();
}

export async function addTask(task) {
	const res = await fetch(API_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(task),
	});
	if (!res.ok) {
		const error = await res.json();
		throw new Error(error.error || 'שגיאה בהוספת משימה');
	}
	return await res.json();
}

export async function deleteTask(id) {
    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
    }); 
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'שגיאה במחיקת משימה');
    }
    return await res.json();
}

export async function updateTaskStatus(id, status) {
    const res = await fetch(`${API_URL}/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'שגיאה בעדכון סטטוס משימה');
    }
    return await res.json();
}

