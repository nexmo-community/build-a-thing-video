let session;

fetch(location.pathname, { method: "POST" })
  .then(res => {
    return res.json();
  })
  .then(res => {
    const apiKey = res.apiKey;
    const sessionId = res.sessionId;
    const token = res.token;
    initializeSession(apiKey, sessionId, token);
  })
  .catch(handleCallback);

registerListeners();

function initializeSession(apiKey, sessionId, token) {
  session = OT.initSession(apiKey, sessionId);

  const publisher = OT.initPublisher(
    "publisher",
    {
      insertMode: "append",
      width: "100%",
      height: "100%"
    },
    handleCallback
  );

  session.connect(token, error => {
    if (error) {
      handleCallback(error);
    } else {
      session.publish(publisher, handleCallback);
    }
  });

  initiateSessionListeners(session);
}

function initiateSessionListeners(session) {
  // Subscribe to a newly created stream
  session.on("streamCreated", event => {
    const streamContainer =
      event.stream.videoType === "screen" ? "screen" : "subscriber";
    session.subscribe(
      event.stream,
      streamContainer,
      {
        insertMode: "append",
        width: "100%",
        height: "100%"
      },
      handleScreenShare(event.stream.videoType)
    );
  });

  session.on("streamDestroyed", event => {
    const screenShare = document.getElementById("screen");
    screenShare.classList.remove("sub-active");
  });
}

function handleCallback(error) {
  if (error) {
    console.log("error: " + error.message);
  } else {
    console.log("callback success");
  }
}

// Screenshare layout
function handleScreenShare(streamType, error) {
  if (error) {
    console.log("error: " + error.message);
  } else {
    if (streamType === "screen") {
      const screenShare = document.getElementById("screen");
      screenShare.classList.add("sub-active");
    }
  }
}

function registerListeners() {
  let screenSharePublisher;
  const screenShare = document.getElementById("screen");
  const startShareBtn = document.getElementById("startScreenShare");
  const stopShareBtn = document.getElementById("stopScreenShare");

  startShareBtn.addEventListener("click", event => {
    OT.checkScreenSharingCapability(response => {
      if (!response.supported || response.extensionRegistered === false) {
        alert("Screen sharing not supported");
      } else if (response.extensionInstalled === false) {
        alert("Browser requires extension");
      } else {
        screenSharePublisher = OT.initPublisher(
          "screen",
          {
            insertMode: "append",
            width: "100%",
            height: "100%",
            videoSource: "screen",
            publishAudio: true
          },
          handleCallback
        );
        session.publish(screenSharePublisher, handleCallback);
        startShareBtn.classList.toggle("hidden");
        stopShareBtn.classList.toggle("hidden");
        screenShare.classList.add("pub-active");
      }
    });
  });

  stopShareBtn.addEventListener("click", event => {
    screenSharePublisher.destroy();
    startShareBtn.classList.toggle("hidden");
    stopShareBtn.classList.toggle("hidden");
    screenShare.classList.remove("pub-active");
  });
}