const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const path = require('path')
// const {open} = require('sqlite')
// const sqlite3 = require('sqlite3')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const { sensitiveHeaders } = require('http2')
// let dbpath = path.join(__dirname, 'practice.db')
let app = express()
app.use(
  cors({      
    origin: "*",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    // optionsSuccessStatus: 200 
          
  })
)
app.use(express.json())
app.listen(3000, () => {
      console.log('server running at http://localhost:3000/')
})
// let db = null
// let intializeDbAndServer = async () => {
//   try {
//     db = await open({
//       filename: dbpath,
//       driver: sqlite3.Database,
//     })
//     app.listen(3000, () => {
//       console.log('server running at http://localhost:3000/')
//     })
//   } catch (e) {
//     console.log(`DB Error ${e.message}`)
//     process.exit(1)
//   }
// }
// intializeDbAndServer()
const connection =mysql.createConnection({
  host: 'sql12.freesqldatabase.com',
  user: 'sql12797366',
  password: 'dszh8STYHa',
  database: 'sql12797366'
})
// const connection =mysql.createConnection({
//   host: 'localhost',
//   user: 'root',
//   password: '#Developer1234dev',
//   database: 'usersData'
// })

connection.connect(error => {
  if (error){
    console.log("Error connecting to the database:", error);
    return;
  }
  console.log("Successfully connected to the database.");
});
const validataPassword = password => {
  return password.length > 4
}
function authenticateToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    return response.status(401).send('Invalid JWT Token')
  } 
  else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        return response.status(401).send('Invalid JWT Token')
      } 
      else {
        next()
      }
    })
  }
}
//API 0
app.get('/users-without-jwtToken',async (request, response) => {
  const getUsersQuery = `
    SELECT * FROM users
  ;`;
   connection.query(getUsersQuery, (error, results) => {
    if(error) {
      console.error('Error executing query:', error);
      return response.status(500).send('Internal Server Error');
    }
    response.status(200).json(results)    
  });
})
//API 1
app.get('/',(request, response) => {
  const myHomeData="It is the registration and Login API to get the list of users.Including with API are /users-without-jwtToken /register /login /users /change-pasword /delete-user /delete-all.Updatation on 6/9/2025."
  response.status(200).json({myHomeData})  
})
//API 2
app.get('/users',authenticateToken, async (request, response) => {
  const getUsersQuery = `
    SELECT * FROM users
  ;`;
  connection.query(getUsersQuery, (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return response.status(500).send('Internal Server Error');
    }       
    response.json(results);
  });
})
//API 3
app.post('/register', async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT * FROM users WHERE username = "${username}";
  `;
  connection.query(selectUserQuery, (error, results) => {
    if (error) {
      console.error('Error executing query:', error);
      return response.status(500).json('Internal Server Error');
    }
    const dbUser = results[0];
    
    if (dbUser) {
      return response.status(400).json('User Already Exist');
    }

    if (!validataPassword(password)) {
      return response.status(401).json('Password is too Short');
    }

    const createUserQuery = `
      INSERT INTO users(username, name, password, gender, location)
      VALUES (
        "${username}",
        "${name}",
        "${hashedPassword}",
        "${gender}",
        "${location}"
      );
    `;
    connection.query(createUserQuery, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        return response.status(500).json('Internal Server Error');
      }
      return response.status(201).json('User Created Successfully');
    });
  });
});
//API 4
app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT * 
    FROM
    users
    WHERE
      username="${username}";`
  connection.query(selectUserQuery,(error, results) => {
    if (error) {
      console.error('Error executing query:', error);     
      return response.status(500).json('Internal Server Error');
    }
    let dbUser = results[0]
 
    if (dbUser === undefined) {
      return response.status(404).json('Invalid User')
    } 
    if(dbUser !== undefined) {
      const isPasswordMatched =bcrypt.compareSync(password, dbUser.password)
  
      if (isPasswordMatched) {
        const payload = { username: username }
        const jwtToken = jwt.sign(payload,"MY_SECRET_TOKEN")
        return response.json({ jwtToken })
      } else {
        response.status(401).json('Invalid Password')
      } 
    }
  })
})
//API 5
app.put('/change-password',authenticateToken, async (request, response) => {
  const {username, oldPassword, newPassword} = request.body

  const selectUserQuery = `
    SELECT * 
    FROM
    users
    WHERE
      username="${username}";`
  connection.query(selectUserQuery, async (error, results) => {
    if (error) {
      console.error('Error executing query:', error);     
      return response.status(500).json('Internal Server Error');
    }     
    let dbUser = results[0] 
    if (dbUser === undefined) {  
      return response.status(404).json('Invalid user')
    }
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password) 
    if (isPasswordMatched) {
      if (validataPassword(newPassword)) {
        let hashedPassword = await bcrypt.hash(newPassword, 10) 
        const updateQuery = `
        UPDATE
        users
        SET
          password="${hashedPassword}"
        WHERE
          username="${username}";`
        connection.query(updateQuery, (error, results) => {
          if (error) {  
            console.error('Error executing query:', error);     
            return response.status(500).json('Internal Server Error');
          }
          return response.status(200).json('Password updated') 
        })
      } else {
        return response.status(401).json('Password is too sShort')
      }
    } else {
      return response.status(401).json('Invalid Current Password')
    }   
  })
})
//API 6
app.delete('/delete-user',authenticateToken,async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    SELECT * 
    FROM
    users
    WHERE
      username="${username}";`
  connection.query(selectUserQuery, (error, results) => {
    if (error) {
      console.error('Error executing query:', error);     
      return response.status(500).json('Internal Server Error');
    }
    let dbUser = results[0]
    if (dbUser === undefined) {
      return response.status(400).json('Invalid user')
    } 
    if(dbUser !== undefined) {
      const isPasswordMatched = bcrypt.compareSync(password, dbUser.password)
      console.log(isPasswordMatched)
      if (isPasswordMatched) {
        const deleteUserQuery = `
        DELETE FROM users
        WHERE username = "${username}" AND password = "${dbUser.password}";`;
        connection.query(deleteUserQuery, (error, results) => {
          if (error) {
            console.error('Error executing query:', error);
            return response.status(500).json('Internal Server Error');
          }    
          response.json("User deleted");
        });
      } else {
        return response.status(400).json('Invalid password')
      } 
    }
  })
})
//API 7
//$2b$10$wu/8RRNWzkdjNAlTEcyRyeHxZRAsTbz3YY7pQWJ8IqTb/4IBKgktK
app.delete('/delete-all', async (request, response) => {
  // const {username, password} = request.body
  const deleteUserQuery = `
        DELETE FROM users;
        ;`;
  connection.query(deleteUserQuery, (error, results) => {
    if (error) {
      console.error('Error executing query:', error);     
      return response.status(500).json('Internal Server Error');
    }
    return response.status(200).json("All Deleted")
  })
})
// SET SQL_SAFE_UPDATES = 0;
// DELETE FROM users;
// SET SQL_SAFE_UPDATES = 1;
module.exports = app
