const { GoogleGenerativeAI } = require("@google/generative-ai");

// Reemplaza con tu clave real de Google AI Studio
const genAI = new GoogleGenerativeAI("tu_clave_real_aqui");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function test() {
  try {
    console.log("Probando conexión con Gemini...");
    
    const result = await model.generateContent("¿Cómo preparar café?");
    const response = await result.response;
    
    console.log("Respuesta exitosa:");
    console.log(response.text());
    
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Detalles:", error);
  }
}

test();