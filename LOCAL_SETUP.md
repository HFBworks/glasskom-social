# 🛠️ Local Development Setup Guide

Follow these steps to get **GlassKom Social** running on your local machine using Visual Studio Code.

## 1. Prerequisites
Ensure you have the following installed:
* **Node.js** (v18.0.0 or higher): [Download here](https://nodejs.org/)
* **Visual Studio Code**: [Download here](https://code.visualstudio.com/)

## 2. Project Initialization
1.  **Open Folder**: Open the root directory of this project in VS Code.
2.  **Open Terminal**: Press ``Ctrl + ` `` (backtick) or go to `Terminal > New Terminal`.
3.  **Install Dependencies**: Run the following command to install all necessary packages:
    ```bash
    npm install
    ```

## 3. Configuration (API Keys)
The app requires a Google Gemini API key for the AI features (Magic Polish, AI Comments).
1.  Create a new file named `.env` in the root directory.
2.  Add your API key to the file like this:
    ```env
    API_KEY=your_actual_gemini_api_key_here
    ```
    *You can get a free key from [Google AI Studio](https://aistudio.google.com/).*

## 4. Running the App
1.  **Start Dev Server**: In the terminal, run:
    ```bash
    npm run dev
    ```
2.  **Access App**: Once the server starts, you will see a link (usually `http://localhost:5173`). Click it or copy it into your browser.

## 5. Troubleshooting
*   **Module Not Found**: If you see errors about missing modules, run `npm install` again.
*   **Port in Use**: If port 5173 is busy, Vite will automatically try 5174. Check the terminal output for the correct URL.
*   **AI Not Working**: Ensure your `.env` file is correctly named and the key is valid.

## 6. Project Structure
*   `index.html`: The entry point.
*   `App.tsx`: The main React component.
*   `services/`: contains API logic (Gemini, Firebase, Storage).
*   `components/`: contains all reusable UI elements.
