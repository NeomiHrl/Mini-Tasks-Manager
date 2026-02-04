import { useState } from 'react';
import { addTask } from '../Api/ApiTasks';
import './AddTask.css';

const statusOptions = [
  { value: 'todo', label: 'לטיפול' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'done', label: 'בוצע' },
];
const priorityOptions = [
  { value: 'low', label: 'נמוכה' },
  { value: 'medium', label: 'בינונית' },
  { value: 'high', label: 'גבוהה' },
];
function AddTask({ existingTasks, onTaskAdded, setStatusError }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [dependencies, setDependencies] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const newTask = {
        title,
        assignee,
        status,
        priority,
        dueDate: dueDate || null,
        dependencies,
      };
      const result = await addTask(newTask);
      setTitle('');
      setAssignee('');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setDependencies([]);
      setSuccess(true);
      if (onTaskAdded) onTaskAdded(result);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      let msg = err.message;
      if (err.response && err.response.data && err.response.data.error) {
        // תרגום הודעות מהשרת לעברית
        if (err.response.data.error.includes('cycle')) {
          msg = 'לא ניתן להוסיף משימה — יש מעגל תלויות';
        } else if (err.response.data.error.includes('Title must be')) {
          msg = 'כותרת המשימה חייבת להיות באורך 3–120 תווים';
        } else if (err.response.data.error.includes('Some dependencies do not exist')) {
          msg = 'יש תלויות שלא קיימות במערכת';
        } else if (err.response.data.error.includes('Invalid status')) {
          msg = 'סטטוס לא תקין';
        } else if (err.response.data.error.includes('Invalid priority')) {
          msg = 'עדיפות לא תקינה';
        } else {
          msg = err.response.data.error;
        }
      }
      setError(msg);
      if (setStatusError) setStatusError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      <h2>הוספת משימה חדשה</h2>
      <div>
        <label>כותרת *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required minLength={3} maxLength={120} />
      </div>
      <div>
        <label>אחראי</label>
        <input value={assignee} onChange={e => setAssignee(e.target.value)} />
      </div>
      <div>
        <label>סטטוס</label>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div>
        <label>עדיפות</label>
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          {priorityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div>
        <label>תאריך יעד</label>
        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
      </div>
      <div style={{ direction: 'rtl', textAlign: 'right' }}>
        <label style={{ fontWeight: 500, marginBottom: 4, display: 'block' }}>תלויות (משימות קיימות)</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 120, overflowY: 'auto', padding: 0, background: 'none' }}>
          {existingTasks && existingTasks.length === 0 && <span style={{ color: '#888' }}>אין משימות קיימות</span>}
          {existingTasks && existingTasks.map(task => (
            <label key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer', padding: '2px 0' }}>
              <input
                type="checkbox"
                value={task.id}
                checked={dependencies.includes(task.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setDependencies([...dependencies, task.id]);
                  } else {
                    setDependencies(dependencies.filter(id => id !== task.id));
                  }
                }}
                style={{ width: 16, height: 16, accentColor: '#b36ae2', marginLeft: 4, marginRight: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '1rem' }}>{task.title}</span>
            </label>
          ))}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
      {success && <div style={{ color: '#4BB543', fontWeight: 600, margin: '12px 0', fontSize: '1.1rem', background: '#e1ffe1', borderRadius: '8px', padding: '8px 0' }}>המשימה נוספה בהצלחה!</div>}
      <button type="submit" disabled={loading}>{loading ? 'מוסיף...' : 'הוסף משימה'}</button>
    </form>
  );
}

export default AddTask;
