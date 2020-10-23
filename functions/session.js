const OpenTok = require('opentok')
const OT = new OpenTok(process.env.VIDEO_KEY, process.env.VIDEO_SECRET)
const MongoClient = require('mongodb').MongoClient
const client = new MongoClient(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true })

exports.handler = async event => {
  try {
    await client.connect()
    const sessions = client.db('bat').collection('sessions')
    let session = await sessions.findOne({ friendly: event.queryStringParameters.room })

    if(event.queryStringParameters.accesscode){
      return {
        statusCode: 200,
        body: JSON.stringify({
          access: session.code === event.queryStringParameters.accesscode
        })
      }
    }

    if(event.queryStringParameters.lock){
      const isLockRoom = event.queryStringParameters.lock === 'true';

      if(isLockRoom && !event.queryStringParameters.code){

        return { statusCode: 500, body: String("Provide Access Code") }
      }

      const updateResponse = await sessions.updateOne({ friendly: event.queryStringParameters.room }, 
        {$set:{locked:isLockRoom, code:event.queryStringParameters.code}})
      
      if(updateResponse.matchedCount === 0)
      {
        return { statusCode: 404, body: String(updateResponse) }
      }
      session = await sessions.findOne({ friendly: event.queryStringParameters.room })
      return {
        statusCode: 200,
        body: JSON.stringify({
          sessionId: session.sessionId,
          locked: session.locked,
          code: session.code
        })
      }
    }

    if (!session) {
      const newSession = { sessionId: await createSession(), friendly: event.queryStringParameters.room, locked: false }
      await sessions.insertOne(newSession)
      session = newSession
    }

    const access = !session.locked || (event.queryStringParameters.code === session.code);
    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.sessionId,
        apiKey: process.env.VIDEO_KEY,
        token: OT.generateToken(session.sessionId, { role: 'publisher' }),
        locked: session.locked,
        access: access
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
      if (err) return reject(err)
      resolve(session.sessionId)
    })
  })
}
