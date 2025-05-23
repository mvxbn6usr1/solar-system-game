// Story Prologue System - Year 2356
// Opening narrative for the solar system RPG

export class StoryPrologue {
    constructor() {
        this.currentChapter = 0;
        this.playerChoices = [];
        this.isActive = false;
        this.storyState = {
            faction: null,
            shipClass: null,
            background: null
        };
        
        this.chapters = [
            {
                id: 'awakening',
                title: 'AWAKENING',
                text: `The year is 2356. You drift in the cold embrace of space, life support failing, memories fragmented.
                
                Your nav computer flickers to life, displaying corrupted data. The last readable entry: "Emergency Protocol Activated - Memory Core Damaged"
                
                Through the cracked viewport, you see the distant glow of Sol. You're home... but which faction will claim you?`,
                choices: [
                    {
                        text: 'Signal Earth Control - "This is... I need assistance..."',
                        result: { faction: 'terra', standing: 20 },
                        consequence: 'Earth dispatch responds with practiced efficiency.'
                    },
                    {
                        text: 'Broadcast on Martian frequencies - "Red Fleet, priority one..."',
                        result: { faction: 'mars', standing: 20 },
                        consequence: 'A gruff Martian voice crackles through: "Copy that, dust-rider."'
                    },
                    {
                        text: 'Ping the nearest mining beacon - "Any rock-hopper listening?"',
                        result: { faction: 'belt', standing: 20 },
                        consequence: 'Multiple voices overlap: "We got you, stranger."'
                    },
                    {
                        text: 'Stay silent and drift deeper',
                        result: { faction: 'independent', standing: 0 },
                        consequence: 'Sometimes the void is the only friend you need.'
                    }
                ]
            },
            {
                id: 'identity',
                title: 'FRAGMENTS OF MEMORY',
                text: `As emergency power floods your systems, fragments of memory surface. The rescue ship approaches, their searchlight playing across your hull.
                
                Your hands move with practiced ease across the controls. Muscle memory remains even if your past doesn't. What kind of pilot were you?`,
                choices: [
                    {
                        text: 'Military precision - every system check perfect',
                        result: { background: 'military', skills: ['combat', 'discipline'] },
                        consequence: 'Your fingers dance across tactical displays with deadly familiarity.'
                    },
                    {
                        text: 'Jury-rigged solutions - held together with hope',
                        result: { background: 'miner', skills: ['engineering', 'resourcefulness'] },
                        consequence: 'You coax life from dying systems with belt-born ingenuity.'
                    },
                    {
                        text: 'Cutting-edge interfaces - prototype systems hum',
                        result: { background: 'scientist', skills: ['technology', 'research'] },
                        consequence: 'Experimental protocols activate at your touch.'
                    },
                    {
                        text: 'Black market mods - hidden compartments everywhere',
                        result: { background: 'smuggler', skills: ['stealth', 'connections'] },
                        consequence: 'Your ship has secrets within secrets.'
                    }
                ]
            },
            {
                id: 'revelation',
                title: 'THE ARTIFACT',
                text: `As the rescue ship tractors you in, your ship's hidden systems activate. A secure compartment opens, revealing an object that makes your blood run cold.
                
                An Artifact. Pre-collapse technology. The kind that started the Fractured Peace of 2341. The kind that factions kill for.
                
                Your rescuers will dock in minutes. What do you do?`,
                choices: [
                    {
                        text: 'Hide it and play dumb',
                        result: { path: 'secretkeeper', artifact: 'hidden' },
                        consequence: 'Some secrets are worth dying for.'
                    },
                    {
                        text: 'Prepare to bargain',
                        result: { path: 'negotiator', artifact: 'leverage' },
                        consequence: 'Information is the ultimate currency.'
                    },
                    {
                        text: 'Activate it',
                        result: { path: 'catalyst', artifact: 'awakened' },
                        consequence: 'The Artifact pulses with alien light...'
                    },
                    {
                        text: 'Destroy it',
                        result: { path: 'guardian', artifact: 'destroyed' },
                        consequence: 'Some things should stay buried.'
                    }
                ]
            }
        ];
        
        this.createPrologueUI();
    }
    
    createPrologueUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'story-prologue';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, rgba(0,10,20,0.95) 0%, rgba(0,0,0,1) 100%);
            display: none;
            z-index: 5000;
            overflow: hidden;
        `;
        
        // Story panel
        this.storyPanel = document.createElement('div');
        this.storyPanel.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            max-height: 80vh;
            background: linear-gradient(135deg, rgba(0,20,40,0.9) 0%, rgba(0,10,30,0.95) 100%);
            border: 2px solid #00ffcc;
            padding: 40px;
            overflow-y: auto;
            font-family: 'Orbitron', monospace;
            color: #ffffff;
            box-shadow: 0 0 50px rgba(0,255,204,0.3);
        `;
        
        // Title
        this.titleElement = document.createElement('h1');
        this.titleElement.style.cssText = `
            text-align: center;
            color: #00ffcc;
            font-size: 32px;
            margin-bottom: 30px;
            text-shadow: 0 0 20px rgba(0,255,204,0.5);
            letter-spacing: 5px;
        `;
        
        // Story text
        this.textElement = document.createElement('div');
        this.textElement.style.cssText = `
            font-size: 18px;
            line-height: 1.8;
            margin-bottom: 40px;
            color: #cccccc;
            white-space: pre-wrap;
        `;
        
        // Choices container
        this.choicesContainer = document.createElement('div');
        this.choicesContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        this.storyPanel.appendChild(this.titleElement);
        this.storyPanel.appendChild(this.textElement);
        this.storyPanel.appendChild(this.choicesContainer);
        this.container.appendChild(this.storyPanel);
        
        // Add starfield background
        this.createStarfield();
        
        document.body.appendChild(this.container);
    }
    
    createStarfield() {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.5;
        `;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const ctx = canvas.getContext('2d');
        
        // Create stars
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 2;
            const opacity = Math.random() * 0.8 + 0.2;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.container.insertBefore(canvas, this.storyPanel);
    }
    
    start() {
        this.isActive = true;
        this.container.style.display = 'block';
        this.showChapter(0);
    }
    
    hide() {
        this.isActive = false;
        this.container.style.display = 'none';
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyPress);
    }
    
    showChapter(index) {
        if (index >= this.chapters.length) {
            this.complete();
            return;
        }
        
        const chapter = this.chapters[index];
        this.currentChapter = index;
        
        // Update UI
        this.titleElement.textContent = chapter.title;
        this.textElement.textContent = chapter.text;
        
        // Clear previous choices
        this.choicesContainer.innerHTML = '';
        
        // Create choice buttons
        chapter.choices.forEach((choice, i) => {
            const button = document.createElement('button');
            button.style.cssText = `
                padding: 20px;
                background: linear-gradient(135deg, rgba(0,100,150,0.3) 0%, rgba(0,50,100,0.3) 100%);
                border: 1px solid #00aaff;
                color: #ffffff;
                cursor: pointer;
                font-size: 16px;
                text-align: left;
                transition: all 0.3s;
                font-family: inherit;
                position: relative;
                overflow: hidden;
            `;
            
            button.innerHTML = `<span style="color: #00ffcc; margin-right: 10px;">[${i + 1}]</span> ${choice.text}`;
            
            // Hover effects
            button.addEventListener('mouseenter', () => {
                button.style.background = 'linear-gradient(135deg, rgba(0,150,200,0.5) 0%, rgba(0,100,150,0.5) 100%)';
                button.style.borderColor = '#00ffcc';
                button.style.paddingLeft = '30px';
                button.style.boxShadow = '0 0 20px rgba(0,255,204,0.3)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.background = 'linear-gradient(135deg, rgba(0,100,150,0.3) 0%, rgba(0,50,100,0.3) 100%)';
                button.style.borderColor = '#00aaff';
                button.style.paddingLeft = '20px';
                button.style.boxShadow = 'none';
            });
            
            button.addEventListener('click', () => {
                this.makeChoice(choice);
            });
            
            this.choicesContainer.appendChild(button);
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyPress);
    }
    
    handleKeyPress = (e) => {
        const num = parseInt(e.key);
        if (num >= 1 && num <= this.chapters[this.currentChapter].choices.length) {
            const choice = this.chapters[this.currentChapter].choices[num - 1];
            this.makeChoice(choice);
        }
    }
    
    makeChoice(choice) {
        // Store the choice
        this.playerChoices.push(choice);
        
        // Apply results to story state
        Object.assign(this.storyState, choice.result);
        
        // Show consequence
        this.showConsequence(choice.consequence, () => {
            this.showChapter(this.currentChapter + 1);
        });
    }
    
    showConsequence(text, callback) {
        // Fade out choices
        this.choicesContainer.style.opacity = '0';
        
        setTimeout(() => {
            this.choicesContainer.innerHTML = `
                <div style="
                    padding: 20px;
                    background: rgba(0,50,100,0.2);
                    border-left: 3px solid #00ffcc;
                    font-style: italic;
                    color: #00ffcc;
                ">
                    ${text}
                </div>
            `;
            this.choicesContainer.style.opacity = '1';
            
            setTimeout(callback, 2000);
        }, 500);
    }
    
    complete() {
        // Clean up
        this.isActive = false;
        document.removeEventListener('keydown', this.handleKeyPress);
        
        // Apply story results to game
        this.applyStoryResults();
        
        // Fade out and close
        this.container.style.opacity = '0';
        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.style.opacity = '1';
            
            // Trigger game start with chosen parameters
            if (window.onPrologueComplete) {
                window.onPrologueComplete(this.storyState);
            }
        }, 1000);
    }
    
    applyStoryResults() {
        // Apply faction standings
        if (window.factionReputation && this.storyState.faction) {
            const standing = this.playerChoices[0]?.result?.standing || 0;
            window.factionReputation.modifyReputation(this.storyState.faction, standing);
        }
        
        // Apply other story choices to player profile
        if (window.playerProfile) {
            window.playerProfile.background = this.storyState.background;
            window.playerProfile.path = this.storyState.path;
            window.playerProfile.artifact = this.storyState.artifact;
        }
        
        console.log('Story complete:', this.storyState);
    }
} 