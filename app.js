require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'suplements_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware de autenticación
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET || 'miClaveSecreta123!', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Middleware para admin
function isAdmin(req, res, next) {
  if (req.user.rol !== 'admin') return res.sendStatus(403);
  next();
}

// Endpoints públicos
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [userExists] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
    
    if (userExists.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO usuarios (email, password_hash, rol) VALUES (?, ?, "cliente")',
      [email, hashedPassword]
    );

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET || 'miClaveSecreta123!',
      { expiresIn: '24h' }
    );

    res.json({ token, rol: user.rol });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Endpoints protegidos
app.get('/api/user', authenticateToken, async (req, res) => {
  res.json(req.user);
});

// Admin endpoints
app.get('/api/admin/productos', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM productos');
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.post('/api/admin/productos', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, categoria, imagen } = req.body;
    
    if (!nombre || !precio || !stock) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const [result] = await pool.query(
      `INSERT INTO productos 
      (nombre, descripcion, precio, stock, categoria, imagen) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, precio, stock, categoria || null, imagen || null]
    );

    const [newProduct] = await pool.query('SELECT * FROM productos WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejo de errores global
process.on('unhandledRejection', (err) => {
  console.error('Error no manejado:', err);
});