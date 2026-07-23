document.addEventListener("DOMContentLoaded", () => {
    const heroSection = document.getElementById("heroSection");
    const loadingSection = document.getElementById("loadingSection");
    const resultsSection = document.getElementById("resultsSection");
    
    const analyzeBtn = document.getElementById("analyzeBtn");
    const repoUrlInput = document.getElementById("repoUrl");
    const backBtn = document.getElementById("backBtn");
    const repoTitle = document.getElementById("repoTitle");
    
    analyzeBtn.addEventListener("click", async () => {
        const url = repoUrlInput.value.trim();
        if (!url) return;
        
        // Extract repo name for sidebar
        const parts = url.split("/");
        const name = parts.length >= 2 ? parts[parts.length-2] + "/" + parts[parts.length-1] : url;
        repoTitle.textContent = name;
        
        // Show Loading
        heroSection.classList.add("hidden");
        loadingSection.classList.remove("hidden");
        
        try {
            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repo_url: url })
            });
            
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Analysis failed");
            }
            
            const data = await response.json();
            
            // Populate UI
            populateStats(data.explain.stats);
            populateAudit(data.audit);
            populateExplain(data.explain);
            window.lastContext = data.explain.context;
            
            // Show Results
            loadingSection.classList.add("hidden");
            resultsSection.classList.remove("hidden");
            
            // Render Diagram after unhiding (so widths are correct)
            setTimeout(() => renderDiagram(data.explain.diagram), 100);
            
        } catch (error) {
            alert("Error: " + error.message);
            loadingSection.classList.add("hidden");
            heroSection.classList.remove("hidden");
        }
    });
    
    // Chat Widget Logic
    const toggleChatBtn = document.getElementById("toggleChatBtn");
    const chatBody = document.getElementById("chatBody");
    const chatInput = document.getElementById("chatInput");
    const chatSendBtn = document.getElementById("chatSendBtn");
    const chatLog = document.getElementById("chatLog");

    toggleChatBtn.addEventListener("click", () => {
        chatBody.classList.toggle("collapsed");
    });

    async function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Append User Message
        const userMsg = document.createElement("div");
        userMsg.className = "chat-msg user-msg";
        userMsg.textContent = text;
        chatLog.appendChild(userMsg);
        
        chatInput.value = "";
        chatLog.scrollTop = chatLog.scrollHeight;

        // Loading Indicator
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "chat-msg ai-msg";
        loadingMsg.textContent = "Thinking...";
        chatLog.appendChild(loadingMsg);
        chatLog.scrollTop = chatLog.scrollHeight;

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: text,
                    context: window.lastContext || {}
                })
            });

            if (!response.ok) throw new Error("API error");
            const data = await response.json();
            loadingMsg.textContent = data.answer;
        } catch (e) {
            loadingMsg.textContent = "Failed to connect to AI.";
        }
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    chatSendBtn.addEventListener("click", sendChatMessage);
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendChatMessage();
    });
    
    backBtn.addEventListener("click", () => {
        resultsSection.classList.add("hidden");
        heroSection.classList.remove("hidden");
        
        // Clear diagram
        document.getElementById("nodesContainer").innerHTML = '';
        document.getElementById("edgesSvg").innerHTML = '';
    });
    
    function populateStats(stats) {
        const statsList = document.getElementById("statsList");
        statsList.innerHTML = "";
        if (stats) {
            statsList.innerHTML = `
                <div class="stat-badge">Files: <strong>${stats.file_count}</strong></div>
                <div class="stat-badge">Depth: <strong>${stats.folder_depth}</strong></div>
                <div class="stat-badge">Entry: <strong>${stats.entry_points}</strong></div>
            `;
        }
    }
    
    function populateAudit(auditData) {
        const envList = document.getElementById("envList");
        const secretsList = document.getElementById("secretsList");
        
        // 16px icons
        const successIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
        const warningIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
        const dangerIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
        
        envList.innerHTML = "";
        if (auditData.env_status === "NO_EXAMPLE") {
            envList.innerHTML = `<div class="audit-alert warning">${warningIcon}<span>No .env.example found.</span></div>`;
        } else if (auditData.env_status === "MISSING" && auditData.missing_env_vars && auditData.missing_env_vars.length > 0) {
            auditData.missing_env_vars.forEach(v => {
                const el = document.createElement("div");
                el.className = "audit-alert danger";
                el.innerHTML = `${dangerIcon}<span>Missing: <strong>${v}</strong></span>`;
                envList.appendChild(el);
            });
        } else {
            envList.innerHTML = `<div class="audit-alert success">${successIcon}<span>.env matches .env.example</span></div>`;
        }
        
        secretsList.innerHTML = "";
        if (auditData.secrets && auditData.secrets.length > 0) {
            auditData.secrets.forEach(s => {
                const el = document.createElement("div");
                el.className = "audit-alert danger";
                el.innerHTML = `${dangerIcon}<span>Found secret in <strong>${s.file}</strong> (L${s.line})</span>`;
                secretsList.appendChild(el);
            });
        } else {
            secretsList.innerHTML = `<div class="audit-alert success">${successIcon}<span>No hardcoded secrets detected.</span></div>`;
        }
    }
    
    function populateExplain(explainData) {
        // Summary
        document.getElementById("summaryText").textContent = explainData.summary || "No summary generated.";
        
        // Stack
        const stackList = document.getElementById("stackList");
        stackList.innerHTML = "";
        if (explainData.stack) {
            for (const [category, techs] of Object.entries(explainData.stack)) {
                if (techs && techs.length > 0) {
                    techs.forEach(tech => {
                        const el = document.createElement("div");
                        el.className = "stack-tag";
                        el.innerHTML = `<span style="background-color: var(--color-${category.toLowerCase()})"></span>${tech}`;
                        stackList.appendChild(el);
                    });
                }
            }
        }
    }
    
    function renderDiagram(diagramData) {
        const container = document.getElementById("diagramContainer");
        const nodesContainer = document.getElementById("nodesContainer");
        const svg = document.getElementById("edgesSvg");
        
        nodesContainer.innerHTML = '';
        svg.innerHTML = '';
        
        if (!diagramData || !diagramData.nodes || diagramData.nodes.length === 0) {
            nodesContainer.innerHTML = "<p style='padding: 24px; color: #888;'>No diagram data available.</p>";
            return;
        }

        const nodes = diagramData.nodes;
        const edges = diagramData.edges || [];
        
        const width = container.clientWidth || 1000;
        const height = container.clientHeight || 800;
        
        const d3Svg = d3.select("#edgesSvg").attr("viewBox", [0, 0, width, height]);
        const edgesLayer = d3Svg.append("g").attr("class", "edges-layer");
        
        d3.select("#nodesContainer").style("transform-origin", "0 0");
        
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                const t = event.transform;
                d3.select("#nodesContainer").style("transform", `translate(${t.x}px, ${t.y}px) scale(${t.k})`);
                edgesLayer.attr("transform", t);
            });
            
        d3.select("#diagramContainer").call(zoom);

        // Auto-fit logic after physics settle
        setTimeout(() => {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            nodes.forEach(d => {
                if (d.x < minX) minX = d.x;
                if (d.x > maxX) maxX = d.x;
                if (d.y < minY) minY = d.y;
                if (d.y > maxY) maxY = d.y;
            });
            
            // Add padding and node dimensions
            minX -= 150; maxX += 150;
            minY -= 80; maxY += 80;
            
            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const contentCenterX = minX + contentWidth / 2;
            const contentCenterY = minY + contentHeight / 2;
            
            const scale = Math.min(width / contentWidth, height / contentHeight) * 0.8;
            const finalScale = Math.min(Math.max(0.2, scale), 1.5);
            
            d3.select("#diagramContainer").transition().duration(750)
                .call(zoom.transform, d3.zoomIdentity
                    .translate(width/2, height/2)
                    .scale(finalScale)
                    .translate(-contentCenterX, -contentCenterY)
                );
        }, 1500);

        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(edges).id(d => d.id).distance(250))
            .force("charge", d3.forceManyBody().strength(-1000))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(120));

        const nodeElements = {};
        
        const drag = d3.drag()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });

        nodes.forEach((node, i) => {
            const el = document.createElement("div");
            el.className = `node`;
            el.id = node.id;
            
            const colorVar = `var(--color-${(node.category || 'logic').toLowerCase()})`;
            el.style.borderLeft = `4px solid ${colorVar}`;
            
            const title = document.createElement("div");
            title.className = "node-title";
            title.textContent = node.label;
            
            const subtitle = document.createElement("div");
            subtitle.className = "node-subtitle";
            subtitle.textContent = node.filename || "";
            
            el.appendChild(title);
            el.appendChild(subtitle);
            
            nodesContainer.appendChild(el);
            nodeElements[node.id] = el;
            
            d3.select(el).datum(node).call(drag);
            
            setTimeout(() => el.classList.add("visible"), i * 100);
        });
        
        const edgeElements = edges.map(edge => {
            return {
                line: edgesLayer.append("line")
                    .attr("stroke", "rgba(255,255,255,0.15)")
                    .attr("stroke-width", 2),
                particle: edgesLayer.append("circle")
                    .attr("r", 3)
                    .attr("class", "particle")
                    .attr("opacity", 0),
                progress: Math.random()
            };
        });
        
        simulation.on("tick", () => {
            nodes.forEach(d => {
                const el = nodeElements[d.id];
                if (el) {
                    el.style.left = `${d.x - 120}px`; 
                    el.style.top = `${d.y - 40}px`;
                }
            });
            
            edgeElements.forEach((e, i) => {
                const edge = edges[i];
                if (edge.source.x && edge.target.x) {
                    e.line
                        .attr("x1", edge.source.x)
                        .attr("y1", edge.source.y)
                        .attr("x2", edge.target.x)
                        .attr("y2", edge.target.y);
                }
            });
        });
        
        function animateParticles() {
            edgeElements.forEach((e, i) => {
                const edge = edges[i];
                if (!edge.source.x) return;
                
                e.progress += 0.005;
                if (e.progress > 1) e.progress = 0;
                
                const eased = e.progress;
                const curX = edge.source.x + (edge.target.x - edge.source.x) * eased;
                const curY = edge.source.y + (edge.target.y - edge.source.y) * eased;
                
                e.particle
                    .attr("cx", curX)
                    .attr("cy", curY)
                    .attr("opacity", eased < 0.1 ? eased * 10 : (eased > 0.9 ? (1-eased)*10 : 1));
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }
});
