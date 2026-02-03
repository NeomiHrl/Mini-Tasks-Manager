const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Mini Task Manager API is running');
});

// בדיקת חיבור למסד הנתונים
app.get('/api/ping-db', (req, res) => {
  pool.query('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json({ success: true, message: 'Database connected!' });
  });
});

// API routes will be added here
// שליפת כל המשימות עם התלויות שלהן
app.get('/api/tasks', (req, res) => {
  const tasksQuery = 'SELECT * FROM tasks';
        // מחיקת משימה
        app.delete('/api/tasks/:id', (req, res) => {
          const { id } = req.params;
          // בדיקה אם יש משימות שתלויות במשימה הזו
          pool.query('SELECT task_id FROM task_dependencies WHERE dependency_id = ?', [id], (err, rows) => {
            if (err) {
              return res.status(500).json({ error: 'שגיאה בבדיקת תלויות', details: err.message });
            }
            if (rows.length) {
              return res.status(400).json({ error: 'לא ניתן למחוק משימה — יש משימות שתלויות בה.', dependents: rows.map(r => r.task_id) });
            }
            // מחיקת התלויות של המשימה
            pool.query('DELETE FROM task_dependencies WHERE task_id = ? OR dependency_id = ?', [id, id], (depErr) => {
              if (depErr) {
                return res.status(500).json({ error: 'שגיאה במחיקת תלויות', details: depErr.message });
              }
              // מחיקת המשימה
              pool.query('DELETE FROM tasks WHERE id = ?', [id], (delErr, result) => {
                if (delErr) {
                  return res.status(500).json({ error: 'שגיאה במחיקת משימה', details: delErr.message });
                }
                if (result.affectedRows === 0) {
                  return res.status(404).json({ error: 'משימה לא נמצאה.' });
                }
                res.json({ success: true });
              });
            });
          });
        });
  pool.query(tasksQuery, (err, tasks) => {
    if (err) {
      return res.status(500).json({ error: 'שגיאת מסד נתונים', details: err.message });
    }
    if (!tasks.length) {
      return res.json([]);
    }
    // שליפת התלויות לכל המשימות
      // עדכון סטטוס משימה
      app.put('/api/tasks/:id/status', (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const validStatus = ['todo', 'in_progress', 'done'];
        if (!validStatus.includes(status)) {
          return res.status(400).json({ error: 'סטטוס לא תקין.' });
        }
        // אם רוצים לסמן כ-done, יש לבדוק שכל התלויות גם done
        if (status === 'done') {
          // שליפת התלויות של המשימה
          pool.query('SELECT dependency_id FROM task_dependencies WHERE task_id = ?', [id], (depErr, deps) => {
            if (depErr) {
              return res.status(500).json({ error: 'שגיאה בשליפת תלויות', details: depErr.message });
            }
            if (!deps.length) {
              return updateStatus();
            }
            const depIds = deps.map(d => d.dependency_id);
            // בדיקת סטטוס של כל התלויות
            pool.query('SELECT id, status FROM tasks WHERE id IN (?)', [depIds], (taskErr, depTasks) => {
              if (taskErr) {
                return res.status(500).json({ error: 'שגיאה בבדיקת סטטוס תלויות', details: taskErr.message });
              }
              const notDone = depTasks.filter(t => t.status !== 'done');
              if (notDone.length) {
                return res.status(400).json({ error: 'לא ניתן לסמן כבוצע — יש משימות תלויות שעדיין לא בוצעו', notDone: notDone.map(t => t.id) });
              }
              updateStatus();
            });
          });
        } else {
          updateStatus();
        }

        function updateStatus() {
          pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id], (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'שגיאה בעדכון סטטוס', details: err.message });
            }
            if (result.affectedRows === 0) {
              return res.status(404).json({ error: 'משימה לא נמצאה.' });
            }
            res.json({ success: true });
          });
        }
      });
    const ids = tasks.map(t => t.id);
    const depQuery = 'SELECT * FROM task_dependencies WHERE task_id IN (?)';
    pool.query(depQuery, [ids], (depErr, deps) => {
      if (depErr) {
        return res.status(500).json({ error: 'שגיאה בשליפת תלויות', details: depErr.message });
      }
      // מיפוי התלויות לכל משימה
      const depMap = {};
      deps.forEach(d => {
        if (!depMap[d.task_id]) depMap[d.task_id] = [];
        depMap[d.task_id].push(d.dependency_id);
      });
      // הוספת התלויות לאובייקט המשימה
      const result = tasks.map(task => ({
        ...task,
        dependencies: depMap[task.id] || []
      }));
      res.json(result);
    });
  });
});

// יצירת משימה חדשה
app.post('/api/tasks', (req, res) => {
  const { title, assignee, status = 'todo', priority = 'medium', dueDate, dependencies = [] } = req.body;

  // ולידציה: אורך כותרת
  if (!title || title.length < 3 || title.length > 120) {
    return res.status(400).json({ error: 'כותרת המשימה חייבת להיות באורך 3–120 תווים.' });
  }

  // ולידציה: סטטוס ופריוריטי
  const validStatus = ['todo', 'in_progress', 'done'];
  const validPriority = ['low', 'medium', 'high'];
  if (!validStatus.includes(status)) {
    return res.status(400).json({ error: 'סטטוס לא תקין.' });
  }
  if (!validPriority.includes(priority)) {
    return res.status(400).json({ error: 'עדיפות לא תקינה.' });
  }

  // ולידציה: תלויות קיימות
  if (dependencies.length) {
    pool.query('SELECT id FROM tasks WHERE id IN (?)', [dependencies], (depErr, depRows) => {
      if (depErr) {
        return res.status(500).json({ error: 'שגיאה בבדיקת תלויות', details: depErr.message });
      }
      const foundIds = depRows.map(r => r.id);
      const missing = dependencies.filter(id => !foundIds.includes(id));
      if (missing.length) {
        return res.status(400).json({ error: 'יש תלויות שלא קיימות במערכת', missing });
      }
      // ולידציה: מניעת מעגלים (DFS)
      checkCycles(dependencies, (cycleErr) => {
        if (cycleErr) {
          return res.status(400).json({ error: 'לא ניתן להוסיף משימה — יש מעגל תלויות', details: cycleErr });
        }
        insertTask();
      });
    });
  } else {
    insertTask();
  }

  // פונקציה לבדוק מעגלי תלויות (DFS)
  function checkCycles(newDeps, callback) {
    // נניח שהמשימה החדשה תקבל id זמני -1
    const tempId = -1;
    // בונים גרף תלויות
    pool.query('SELECT task_id, dependency_id FROM task_dependencies', (err, rows) => {
      if (err) return callback('שגיאה בשליפת תלויות');
      // מוסיפים את התלויות החדשות לגרף
      const graph = {};
      rows.forEach(r => {
        if (!graph[r.task_id]) graph[r.task_id] = [];
        graph[r.task_id].push(r.dependency_id);
      });
      graph[tempId] = newDeps;
      // DFS לבדוק אם יש מסלול מהתלויות חזרה ל-tempId
      function hasCycle(node, visited, stack) {
        visited[node] = true;
        stack[node] = true;
        const neighbors = graph[node] || [];
        for (let n of neighbors) {
          if (n === tempId) return true;
          if (!visited[n] && hasCycle(n, visited, stack)) return true;
          else if (stack[n]) return true;
        }
        stack[node] = false;
        return false;
      }
      // בודקים עבור כל תלות חדשה
      for (let dep of newDeps) {
        if (hasCycle(dep, {}, {})) {
          return callback('נמצא מעגל תלויות הכולל את המשימה ' + dep);
        }
      }
      callback(null);
    });
  }

  let taskId;
  function insertTask() {
    const insertQuery = 'INSERT INTO tasks (title, assignee, status, priority, dueDate) VALUES (?, ?, ?, ?, ?)';
    pool.query(insertQuery, [title, assignee, status, priority, dueDate || null], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'שגיאה בהוספת משימה', details: err.message });
      }
      taskId = result.insertId;
      // הכנסת התלויות
      if (dependencies.length) {
        const depValues = dependencies.map(depId => [taskId, depId]);
        pool.query('INSERT INTO task_dependencies (task_id, dependency_id) VALUES ?', [depValues], (depErr2) => {
          if (depErr2) {
            return res.status(500).json({ error: 'שגיאה בהוספת תלויות', details: depErr2.message });
          }
          returnTask();
        });
      } else {
        returnTask();
      }
    });
  }

  function returnTask() {
    // שליפת המשימה עם התלויות
    pool.query('SELECT * FROM tasks WHERE id = ?', [taskId], (err, rows) => {
      if (err || !rows.length) {
        return res.status(500).json({ error: 'שגיאה בשליפת משימה', details: err ? err.message : 'לא נמצא' });
      }
      const task = rows[0];
      pool.query('SELECT dependency_id FROM task_dependencies WHERE task_id = ?', [taskId], (depErr, deps) => {
        if (depErr) {
          return res.status(500).json({ error: 'שגיאה בשליפת תלויות', details: depErr.message });
        }
        task.dependencies = deps.map(d => d.dependency_id);
        res.status(201).json(task);
      });
    });
  }
    });
  


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
