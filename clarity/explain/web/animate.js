document.addEventListener("DOMContentLoaded", () => {
    const data = window.CLARITY_DATA || {};
    
    // 1. Populate Summary
    document.getElementById("summaryText").textContent = data.summary || "No summary available.";
    
    // 2. Populate Stack List
    const stackList = document.getElementById("stackList");
    if (data.stack) {
        for (const [category, techs] of Object.entries(data.stack)) {
            if (techs && techs.length > 0) {
                const item = document.createElement("div");
                item.className = "stack-item";
                item.innerHTML = `<strong style="color: var(--color-${category})">${category}</strong>: ${techs.join(", ")}`;
                stackList.appendChild(item);
            }
        }
    }
    
    // 2b. Populate Stats List
    const statsList = document.getElementById("statsList");
    if (data.stats && statsList) {
        statsList.innerHTML = `
            <div class="stack-item"><strong>Files:</strong> ${data.stats.file_count || 0}</div>
            <div class="stack-item"><strong>Max Depth:</strong> ${data.stats.folder_depth || 0}</div>
            <div class="stack-item"><strong>Entry Points:</strong> ${data.stats.entry_points || 0}</div>
        `;
    }
    
    // 3. Render Diagram
    const container = document.getElementById("diagramContainer");
    const nodesContainer = document.getElementById("nodesContainer");
    const svg = document.getElementById("edgesSvg");
    
    if (!data.diagram || !data.diagram.nodes || data.diagram.nodes.length === 0) {
        nodesContainer.innerHTML = "<p style='padding: 1rem; color: #6b7280'>No diagram data available.</p>";
        return;
    }
    
    const nodes = data.diagram.nodes;
    const edges = data.diagram.edges || [];
    
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 700;
    
    // Using a simple force-directed like grid layout
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const cellW = width / cols;
    const cellH = height / rows;
    
    const nodeElements = {};
    
    nodes.forEach((node, i) => {
        const el = document.createElement("div");
        el.className = `node cat-${node.category || 'logic'}`;
        el.id = node.id;
        
        const title = document.createElement("div");
        title.className = "node-title";
        title.textContent = node.label;
        
        const subtitle = document.createElement("div");
        subtitle.className = "node-subtitle";
        subtitle.textContent = node.filename || "";
        
        el.appendChild(title);
        el.appendChild(subtitle);
        
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const x = (col * cellW) + (cellW / 2) - 80 + (Math.random() * 40 - 20);
        const y = (row * cellH) + (cellH / 2) - 30 + (Math.random() * 40 - 20);
        
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        
        // Click to zoom
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (container.classList.contains("zoomed")) {
                container.classList.remove("zoomed");
                container.style.transform = `scale(1) translate(0px, 0px)`;
            } else {
                container.classList.add("zoomed");
                // Calculate center offset
                const cX = width / 2;
                const cY = height / 2;
                const tX = cX - (x + 80);
                const tY = cY - (y + 30);
                container.style.transform = `scale(1.5) translate(${tX/1.5}px, ${tY/1.5}px)`;
            }
        });
        
        nodesContainer.appendChild(el);
        nodeElements[node.id] = {el, x, y};
        
        // Sequenced entry animation
        setTimeout(() => {
            el.classList.add("visible");
        }, i * 150); // 150ms stagger
    });
    
    // Reset zoom on container click
    container.addEventListener("click", () => {
        if (container.classList.contains("zoomed")) {
            container.classList.remove("zoomed");
            container.style.transform = `scale(1) translate(0px, 0px)`;
        }
    });
    
    // Draw edges
    edges.forEach(edge => {
        const s = nodeElements[edge.source];
        const t = nodeElements[edge.target];
        if (s && t) {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", s.x + 80); // roughly center of node
            line.setAttribute("y1", s.y + 30);
            line.setAttribute("x2", t.x + 80);
            line.setAttribute("y2", t.y + 30);
            line.setAttribute("stroke", "rgba(255,255,255,0.1)");
            line.setAttribute("stroke-width", "2");
            svg.appendChild(line);
            
            // Particle animation
            const particle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            particle.setAttribute("r", "3");
            particle.setAttribute("class", "particle");
            svg.appendChild(particle);
            
            let progress = Math.random(); 
            
            function animateParticle() {
                progress += 0.005;
                if (progress > 1) progress = 0;
                
                const eased = progress; // Linear flow is better for data
                
                const curX = (s.x + 80) + (t.x - s.x) * eased;
                const curY = (s.y + 30) + (t.y - s.y) * eased;
                
                particle.setAttribute("cx", curX);
                particle.setAttribute("cy", curY);
                particle.setAttribute("opacity", eased < 0.1 ? eased * 10 : (eased > 0.9 ? (1-eased)*10 : 1));
                
                requestAnimationFrame(animateParticle);
            }
            animateParticle();
        }
    });
});
