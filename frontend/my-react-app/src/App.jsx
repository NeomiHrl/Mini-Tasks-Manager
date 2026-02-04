import React, { useEffect, useState } from 'react';
import AddTask from './components/AddTask';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import './App.css';
import { updateTaskStatus, deleteTask } from './Api/ApiTasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [statusError, setStatusError] = useState(null);
  // נעלם אוטומטית אחרי 3 שניות
  React.useEffect(() => {
    if (statusError) {
      const timer = setTimeout(() => setStatusError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusError]);

  const fetchTasks = () => {
    setLoading(true);
    setError(null);
    fetch('http://localhost:3001/api/tasks')
      .then((res) => res.json())
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError('שגיאה בטעינת המשימות');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Map task IDs to titles for dependency display
  const idToTitle = Object.fromEntries(tasks.map(t => [t.id, t.title]));
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
  const getPriorityLabel = (priority) => {
    const found = priorityOptions.find(opt => opt.value === priority);
    return found ? found.label : priority;
  };

  // דיאלוג מחיקה
  const [deleteDialog, setDeleteDialog] = useState({ open: false, taskId: null });
  const columns = [
    { headerName: 'ID', field: 'id', width: 80, sortable: true, filter: 'agTextColumnFilter' },
    { headerName: 'כותרת', field: 'title', flex: 1, sortable: true, filter: 'agTextColumnFilter' },
    { headerName: 'אחראי', field: 'assignee', width: 120, sortable: true, filter: 'agTextColumnFilter' },
    {
      headerName: 'סטטוס',
      field: 'status',
      width: 140,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params) => {
        const { id, status } = params.data;
        return (
          <select
            value={status}
            style={{ fontSize: '1rem', padding: '4px 8px', borderRadius: '8px', border: '1px solid #b36ae2', background: '#f8e1f4', color: '#222' }}
            onChange={async (e) => {
              const newStatus = e.target.value;
              try {
                setStatusError(null);
                await updateTaskStatus(id, newStatus);
                fetchTasks();
              } catch (err) {
                let msg = err.message;
                if (err.response && err.response.data && err.response.data.error) {
                  if (err.response.data.error.includes('Cannot mark as done') || err.response.data.error.includes('לא ניתן לסמן כבוצע')) {
                    msg = 'לא ניתן לסמן כבוצע — יש משימות תלויות שעדיין לא בוצעו';
                    if (err.response.data.notDone) {
                      msg += ': ' + err.response.data.notDone.join(', ');
                    }
                  } else {
                    msg = err.response.data.error;
                  }
                }
                setStatusError(msg);
              }
            }}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      },
    },
    {
      headerName: 'עדיפות',
      field: 'priority',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params) => getPriorityLabel(params.value)
    },
    { headerName: 'תאריך יעד', field: 'dueDate', width: 120, sortable: true, filter: 'agTextColumnFilter' },
    {
      headerName: 'תלויות',
      field: 'dependencies',
      flex: 1,
      sortable: false,
      filter: 'agTextColumnFilter',
      valueGetter: (params) =>
        params.data.dependencies && params.data.dependencies.length
          ? params.data.dependencies.map(id => idToTitle[id] || id).join(', ')
          : '—',
    },
    {
      headerName: '',
      field: 'actions',
      width: 60,
      cellRenderer: (params) => {
        const { id } = params.data;
        return (
          <button
            title="מחק משימה"
            style={{
              background: 'none',
              border: 'none',
              color: '#d32f2f',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: 0,
              margin: 0,
            }}
            onClick={() => setDeleteDialog({ open: true, taskId: id })}
          >
            🗑️
          </button>
        );
      },
    },
  ];

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', minHeight: '100vh', justifyContent: 'center' }}>
      <h1 style={{ textAlign: 'center', fontSize: '2.5rem', marginTop: '32px' }}>Mini Tasks Manager</h1>
      {!showAdd && (
        <>
          <button
            style={{
              background: 'linear-gradient(90deg, #e1e1fa 0%, #f8e1f4 100%)',
              color: '#b36ae2',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 32px',
              fontSize: '1.2rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '12px',
              boxShadow: '0 2px 12px rgba(180, 140, 255, 0.10)'
            }}
            onClick={() => setShowAdd(true)}
          >
            הוספת משימה
          </button>
          {statusError && (
            <div className="error-message">{statusError}</div>
          )}
        </>
      )}
      {showAdd ? (
        <div style={{ width: '100%', maxWidth: 600, position: 'relative' }}>
          <button
            className="back-to-tasks-btn"
            onClick={() => setShowAdd(false)}
            style={{ position: 'absolute', top: 16, right: 16 }}
          >
            חזרה למשימות
          </button>
          <AddTask
            onTaskAdded={() => {
              setShowAdd(false);
              fetchTasks();
            }}
            existingTasks={tasks}
            setStatusError={setStatusError}
          />
          {statusError && (
            <div className="error-message">{statusError}</div>
          )}
        </div>
      ) : (
        <div style={{ width: '200%', maxWidth: 1100, margin: '32px auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? (
            <div>טוען משימות...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="ag-theme-alpine" style={{ height: 520, width: '100%', maxWidth: 1000, margin: '0 auto', borderRadius: '18px', boxShadow: '0 4px 24px rgba(180, 140, 255, 0.10)' }}>
              <AgGridReact
                rowData={tasks}
                columnDefs={columns}
                domLayout="autoHeight"
                pagination={true}
                paginationPageSize={10}
              />
              {/* דיאלוג מחיקה */}
              {deleteDialog.open && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(0,0,0,0.18)',
                  zIndex: 2000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    background: '#fff6fb',
                    border: '2px solid #d32f2f',
                    borderRadius: 16,
                    padding: '32px 32px 24px 32px',
                    minWidth: 320,
                    boxShadow: '0 4px 32px rgba(211,47,47,0.12)',
                    textAlign: 'center',
                  }}>
                    <div style={{ color: '#d32f2f', fontWeight: 700, fontSize: '1.15rem', marginBottom: 18 }}>
                      האם למחוק את המשימה?
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                      <button
                        style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                        onClick={async () => {
                          try {
                            setStatusError(null);
                            await deleteTask(deleteDialog.taskId);
                            fetchTasks();
                          } catch (err) {
                            let msg = err.message;
                            if (err.response && err.response.data && err.response.data.error) {
                              msg = err.response.data.error;
                            }
                            setStatusError(msg);
                          } finally {
                            setDeleteDialog({ open: false, taskId: null });
                          }
                        }}
                      >
                        כן, מחק
                      </button>
                      <button
                        style={{ background: '#fff', color: '#d32f2f', border: '1.5px solid #d32f2f', borderRadius: 8, padding: '8px 24px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}
                        onClick={() => setDeleteDialog({ open: false, taskId: null })}
                      >
                        לא
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
