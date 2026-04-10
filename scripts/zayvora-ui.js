/**
 * zayvora-ui.js
 * Core logic for the Zayvora Sovereign Engineering Interface.
 * Handles 3-layer engine integration, 6-stage visualization, and tool tracking.
 */

const ENGINE_URL = "http://localhost:8902";
const OLLAMA_URL = "http://localhost:11434"; // Fallback
const DEFAULT_MODEL = "daxini2404/zayvora:latest";

const STAGES = [
    "decompose", "retrieve", "synthesize", "calculate", "verify", "revise"
];

class ZayvoraUI {
    constructor() {
        this.messageContainer = document.getElementById("message-container");
        this.userInput = document.getElementById("user-input");
        this.sendBtn = document.getElementById("send-btn");
        this.statusDots = {
            zayvora: document.querySelector("#status-zayvora .status-dot"),
            zayvoraText: document.querySelector("#status-zayvora .val")
        };
        
        this.isProcessing = false;
        this.currentMode = "3-LAYER"; // "3-LAYER" or "DIRECT-OLLAMA"
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkConnection();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener("click", () => this.handleSendMessage());
        this.userInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleSendMessage();
        });
    }

    async checkConnection() {
        try {
            const resp = await fetch(`${ENGINE_URL}/health`, { method: "GET" });
            if (resp.ok) {
                this.updateStatus("zayvora", "online", "8902 ACTIVE");
                this.currentMode = "3-LAYER";
            } else {
                throw new Error("Engine offline");
            }
        } catch (err) {
            console.warn("Zayvora Engine (8902) unreachable. Attempting Ollama fallback...");
            this.updateStatus("zayvora", "offline", "FALLBACK: OLLAMA");
            this.currentMode = "DIRECT-OLLAMA";
            
            // Check Ollama
            try {
                const ollamaResp = await fetch(`${OLLAMA_URL}/api/tags`);
                if (!ollamaResp.ok) throw new Error("Ollama offline");
            } catch (oErr) {
                this.updateStatus("zayvora", "offline", "STK DISCONNECTED");
            }
        }
    }

    updateStatus(key, state, text) {
        if (this.statusDots[key]) {
            this.statusDots[key].className = `status-dot ${state}`;
            this.statusDots[`${key}Text`].textContent = text;
        }
    }

    async handleSendMessage() {
        const text = this.userInput.value.trim();
        if (!text || this.isProcessing) return;

        this.isProcessing = true;
        this.userInput.value = "";
        this.addMessage("user", text);
        this.resetStages();

        if (this.currentMode === "3-LAYER") {
            await this.callThreeLayerEngine(text);
        } else {
            await this.callDirectOllama(text);
        }

        this.isProcessing = false;
    }

    addMessage(role, text, isMarkdown = true) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${role}`;
        
        if (role === "zayvora") {
            msgDiv.innerHTML = `<div class="zayvora-content">${this.formatText(text)}</div>`;
        } else {
            msgDiv.textContent = text;
        }
        
        this.messageContainer.appendChild(msgDiv);
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
        return msgDiv;
    }

    formatText(text) {
        // Simple formatter for engineering responses
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n/g, '<br>');
    }

    resetStages() {
        STAGES.forEach(s => {
            const el = document.getElementById(`stage-${s}`);
            if (el) el.classList.remove("active", "complete", "failed");
        });
        document.querySelectorAll(".tool-icon").forEach(icon => icon.classList.remove("active"));
    }

    updateStage(stage, status) {
        const el = document.getElementById(`stage-${stage.toLowerCase()}`);
        if (!el) return;

        if (status === "active") {
            el.classList.add("active");
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (status === "complete") {
            el.classList.remove("active");
            el.classList.add("complete");
        } else if (status === "failed") {
            el.classList.remove("active");
            el.classList.add("failed");
        }
    }

    async callThreeLayerEngine(text) {
        // Simulate stage progression for the 3-layer wait time
        this.updateStage("decompose", "active");
        
        try {
            const response = await fetch(`${ENGINE_URL}/solve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: text })
            });

            if (!response.ok) throw new Error("Engine solve failed");
            const result = await response.json();
            
            // Map JSON layers to UI stages
            this.updateStage("decompose", "complete");
            this.updateStage("retrieve", "active");
            
            // Logic for retrieval visualization
            if (result.layer_1 && result.layer_1.status === "READY") {
                this.updateStage("retrieve", "complete");
                document.getElementById("tool-nex").classList.add("active");
            }

            this.updateStage("synthesize", "active");
            setTimeout(() => this.updateStage("synthesize", "complete"), 300);

            this.updateStage("calculate", "active");
            if (result.layer_2 && result.layer_2.status === "COMPUTED") {
                document.getElementById("tool-calc").classList.add("active");
                document.getElementById("tool-units").classList.add("active");
                this.updateStage("calculate", "complete");
            }

            this.updateStage("verify", "active");
            if (result.layer_3) {
                document.getElementById("tool-guardian").classList.add("active");
                if (result.layer_3.final_status === "VERIFIED") {
                    this.updateStage("verify", "complete");
                } else {
                    this.updateStage("verify", "failed");
                }
            }

            this.updateStage("revise", "active");
            
            // Final Output
            if (result.final_answer) {
                const answer = result.final_answer;
                let html = `<strong>${answer.description}</strong><br><br>`;
                html += `DECONSTRUCTED FORMULA:<br><code style="background: rgba(0,0,0,0.5); padding: 10px; display: block; border-radius: 4px; margin: 5px 0;">${answer.equation}</code><br>`;
                html += `<span style="color: var(--stage-done); font-weight: bold; font-size: 1.2rem;">VERIFIED RESULT: ${answer.display_result}</span><br><br>`;
                html += `<div style="font-size: 0.7rem; opacity: 0.6;">${answer.expert_signature}</div>`;
                
                this.addMessage("zayvora", html);
                this.updateStage("revise", "complete");
            } else {
                this.addMessage("zayvora", result.message || "I cannot provide a verified result for this query.");
                this.updateStage("revise", "failed");
            }

        } catch (err) {
            console.error(err);
            this.addMessage("zayvora", "[ERROR] 3-Layer Logic interrupted. Switching to Direct Ollama fallback...");
            this.currentMode = "DIRECT-OLLAMA";
            await this.callDirectOllama(text);
        }
    }

    async callDirectOllama(text) {
        this.addMessage("zayvora", "[STATUS: 8902 OFFLINE. STREAMING FROM OLLAMA...]", false);
        
        try {
            const response = await fetch(`${OLLAMA_URL}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: DEFAULT_MODEL,
                    prompt: text,
                    stream: true
                })
            });

            if (!response.ok) throw new Error("Ollama generation failed");

            const reader = response.body.getReader();
            let fullText = "";
            let currentStage = "";
            
            const msgDiv = this.addMessage("zayvora", "");
            const contentDiv = msgDiv.querySelector(".zayvora-content");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = new TextDecoder().decode(value);
                const lines = chunk.split("\n");
                
                for (const line of lines) {
                    if (!line) continue;
                    const json = JSON.parse(line);
                    if (json.response) {
                        const token = json.response;
                        fullText += token;
                        contentDiv.innerHTML = this.formatText(fullText);
                        
                        // Parse stage markers e.g. <DECOMPOSE>
                        this.parseStreamingTags(token);
                    }
                }
            }

        } catch (err) {
            this.addMessage("zayvora", "[CRITICAL] All engine nodes unreachable. Please check Ollama and Zayvora API status.");
        }
    }

    parseStreamingTags(token) {
        const tagMatch = token.match(/<(\/?[A-Z]+)>/);
        if (tagMatch) {
            const tag = tagMatch[1].toLowerCase();
            if (STAGES.includes(tag)) {
                this.updateStage(tag, "active");
            } else if (tag.startsWith("/") && STAGES.includes(tag.substring(1))) {
                this.updateStage(tag.substring(1), "complete");
            }
        }
    }
}

// Initialize on Load
document.addEventListener("DOMContentLoaded", () => {
    window.zayvora = new ZayvoraUI();
});
