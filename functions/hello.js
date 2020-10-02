exports.handler = async event => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'ok' })
    }
  } catch (err) {
    console.error(err.String())
    return { statusCode: 500, body: err.toString() }
  }
}
