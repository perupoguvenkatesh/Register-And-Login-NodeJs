const express = require('express')
const cors = require('cors')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const databasePath = path.join(__dirname, 'userData.db')

const app = express()
app.use(express.json())
app.use(cors())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()
function authenticateToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}
//API 1
const validataPassword = password => {
  return password.length > 4
}
app.get('/amma', (request, response) => {
  response.send('It is working...')
})
app.post('/register/', async (request, response) => {
  const {username, name, password, gender, location} = request.body
  const hashedPassword = await bcrypt.hash(request.body.password, 10)
  const selectUserQuery = `
    SELECT
    * 
    FROM
      user
    WHERE username="${username}";`
  let dbUser = await database.get(selectUserQuery)
  if (dbUser === undefined) {
    const createUserQuery = `
    INSERT INTO user(username,name,password,gender,location)
    values(
      "${username}",
      "${name}",
      "${hashedPassword}",
      "${gender}",
      "${location}"
    );`
    if (validataPassword(password)) {
      await database.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
    select
    *
    from
      User
    where 
    username='${username}'
    `
  const databaseUser = await database.get(selectUserQuery)
  if (databaseUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isValidPassword = await bcrypt.compare(
      password,
      databaseUser.password,
    )
    if (isValidPassword === true) {
      const payload = {
        username: username,
      }
      const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})
//API2

module.exports = app
