const fs = require('fs');

async function testImg2Img() {
  const apiKey = 'AIzaSyCLuOJv8gKpiFi0NyRY6dqlPlVLS3eJmJA';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Fake tiny PNG base64
  const fakePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: fakePngBase64
            }
          },
          { text: "This man is singing in the rain. Edit this image to add a hat." }
        ]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch failed:", error);
  }
}

testImg2Img();
