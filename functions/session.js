const OpenTok = require('opentok')
const OT = new OpenTok(process.env.VIDEO_KEY, process.env.VIDEO_SECRET)
const MongoClient = require('mongodb').MongoClient
const client = new MongoClient(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })

exports.handler = async event => {
  try {
    await client.connect()
    const sessions = client.db('bat').collection('sessions')
    let session = await sessions.findOne({ friendly: event.queryStringParameters.room })

    if (!session) {
      const newSession = { sessionId: await createSession(), friendly: event.queryStringParameters.room }
      await sessions.insertOne(newSession)
      session = newSession
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.sessionId,
        apiKey: process.env.VIDEO_KEY,
        token: OT.generateToken(session.sessionId, { role: 'publisher' })
      })
    }
  } catch (err) {
    console.error(String(err))
    return { statusCode: 500, body: String(err) }
  }
}

function createSession() {
  return new Promise((resolve, reject) => {
    OT.createSession((err, session) => {
      if (err) reject(err)
      else resolve(session.sessionId)
    })
  })
}
