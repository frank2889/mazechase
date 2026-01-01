#!/usr/bin/env python3
"""
MazeChase AI Workflow Orchestrator

Automatische loop:
1. Run AI testers → out/evaluation-*.json
2. Lees evaluation → prioriteer taken
3. Implementeer suggesties (via Copilot/Claude)
4. Maak in/implementation-*.json
5. Herhaal

Usage:
    python workflow.py              # Interactieve mode
    python workflow.py --auto       # Volledig automatisch (experimental)
    python workflow.py --status     # Toon huidige status
"""

import json
import subprocess
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Paths
TESTS_DIR = Path(__file__).parent
IN_DIR = TESTS_DIR / "in"
OUT_DIR = TESTS_DIR / "out"
PROJECT_ROOT = TESTS_DIR.parent

class WorkflowOrchestrator:
    def __init__(self):
        self.ensure_dirs()
        
    def ensure_dirs(self):
        """Maak in/ en out/ folders aan indien nodig."""
        IN_DIR.mkdir(exist_ok=True)
        OUT_DIR.mkdir(exist_ok=True)
        
    def get_latest_file(self, directory: Path, prefix: str) -> Optional[Path]:
        """Haal het nieuwste bestand op met gegeven prefix."""
        files = sorted(directory.glob(f"{prefix}*.json"), reverse=True)
        return files[0] if files else None
    
    def get_latest_evaluation(self) -> Optional[dict]:
        """Lees de laatste evaluation uit out/."""
        latest = self.get_latest_file(OUT_DIR, "evaluation-")
        if latest:
            print(f"📖 Laatste evaluation: {latest.name}")
            return json.loads(latest.read_text())
        return None
    
    def get_latest_implementation(self) -> Optional[dict]:
        """Lees de laatste implementation uit in/."""
        latest = self.get_latest_file(IN_DIR, "implementation-")
        if latest:
            print(f"📋 Laatste implementation: {latest.name}")
            return json.loads(latest.read_text())
        return None
    
    def run_ai_testers(self) -> bool:
        """Run de AI testers en genereer nieuwe evaluation."""
        print("\n" + "="*60)
        print("🤖 STAP 1: AI Testers runnen...")
        print("="*60)
        
        try:
            result = subprocess.run(
                ["node", "ai-game-testers.js"],
                cwd=TESTS_DIR,
                capture_output=False,
                timeout=300  # 5 minuten timeout
            )
            return result.returncode == 0
        except subprocess.TimeoutExpired:
            print("❌ Timeout: AI testers duurden te lang")
            return False
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    def show_priorities(self, evaluation: dict) -> list:
        """Toon geprioriteerde suggesties uit evaluation."""
        print("\n" + "="*60)
        print("📊 STAP 2: Prioriteiten")
        print("="*60)
        
        # New format: prioritizedActions
        actions = evaluation.get("prioritizedActions", [])
        
        if not actions:
            # Fallback: old format with items structure
            items = evaluation.get("items", {})
            for category, tasks in items.items():
                if isinstance(tasks, list):
                    for task in tasks[:3]:
                        actions.append({
                            "action": task.get("name") or task.get("task") or str(task),
                            "category": category,
                            "priority": "medium",
                            "suggestedBy": [task.get("from", "unknown")]
                        })
        
        if not actions:
            print("✅ Geen nieuwe suggesties gevonden!")
            return []
        
        # Show summary
        summary = evaluation.get("summary", {})
        if summary:
            print(f"\n📈 Totaal: {summary.get('totalActions', len(actions))} acties")
            print(f"   🔴 High: {summary.get('highPriority', 0)} | 🟡 Medium: {summary.get('mediumPriority', 0)} | 🟢 Low: {summary.get('lowPriority', 0)}")
        
        print(f"\n🎯 Top {min(5, len(actions))} prioriteiten:\n")
        for i, a in enumerate(actions[:5], 1):
            priority = a.get("priority", "medium")
            icon = "🔴" if priority == "high" else "🟡" if priority == "medium" else "🟢"
            action = a.get("action", str(a))
            suggesters = ", ".join(a.get("suggestedBy", ["?"]))
            file = a.get("file", "")
            
            print(f"  {i}. {icon} {action}")
            print(f"     └─ by: {suggesters}" + (f" | file: {file}" if file else ""))
        
        return actions
    
    def create_implementation_log(self, tasks: list, source_evaluation: str) -> Path:
        """Maak een nieuwe implementation log in in/."""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
        filename = f"implementation-{timestamp}.json"
        filepath = IN_DIR / filename
        
        log = {
            "metadata": {
                "type": "implementation_log",
                "timestamp": datetime.now().isoformat() + "Z",
                "source": source_evaluation,
                "generatedBy": "workflow.py"
            },
            "summary": {
                "totalTasks": len(tasks),
                "completed": sum(1 for t in tasks if t.get("status") == "completed"),
                "skipped": sum(1 for t in tasks if t.get("status") == "skipped")
            },
            "tasks": tasks,
            "nextActions": []
        }
        
        filepath.write_text(json.dumps(log, indent=2))
        print(f"\n✅ Implementation log gemaakt: {filename}")
        return filepath
    
    def interactive_implementation(self, actions: list, evaluation_file: str) -> list:
        """Interactieve mode: vraag gebruiker wat geïmplementeerd is."""
        print("\n" + "="*60)
        print("🔧 STAP 3: Implementatie")
        print("="*60)
        
        if not actions:
            return []
        
        tasks = []
        print("\nVoor elke actie, geef status:")
        print("  [c] = completed (geïmplementeerd)")
        print("  [s] = skipped (overgeslagen)")
        print("  [p] = partial (gedeeltelijk)")
        print("  [Enter] = skip deze ronde")
        print()
        
        for i, a in enumerate(actions[:5], 1):
            action = a.get("action", str(a))
            category = a.get("category", "general")
            file = a.get("file", "")
            
            print(f"\n  {i}. [{category}] {action[:60]}...")
            if file:
                print(f"     File: {file}")
            
            response = input("     Status? [c/s/p/Enter]: ").strip().lower()
            
            if response == 'c':
                files_input = input("     Welke files gewijzigd? (comma separated, of Enter voor default): ").strip()
                if not files_input and file:
                    files_input = file
                changes = input("     Wat gewijzigd? (comma separated): ").strip()
                tasks.append({
                    "id": a.get("id", f"task-{i}"),
                    "name": action[:100],
                    "status": "completed",
                    "files": [f.strip() for f in files_input.split(",")] if files_input else [],
                    "changes": [c.strip() for c in changes.split(",")] if changes else [],
                    "suggestedBy": a.get("suggestedBy", [])
                })
            elif response == 's':
                reason = input("     Reden voor skip: ").strip()
                tasks.append({
                    "id": a.get("id", f"task-{i}"),
                    "name": action[:100],
                    "status": "skipped",
                    "reason": reason or "Overgeslagen"
                })
            elif response == 'p':
                tasks.append({
                    "id": a.get("id", f"task-{i}"),
                    "name": action[:100],
                    "status": "partial"
                })
        
        return tasks
    
    def show_status(self):
        """Toon huidige workflow status."""
        print("\n" + "="*60)
        print("📊 WORKFLOW STATUS")
        print("="*60)
        
        # Count files
        in_files = list(IN_DIR.glob("implementation-*.json"))
        out_files = list(OUT_DIR.glob("evaluation-*.json"))
        
        print(f"\n📁 in/  folder: {len(in_files)} implementation logs")
        print(f"📁 out/ folder: {len(out_files)} evaluations")
        
        # Latest files
        latest_impl = self.get_latest_implementation()
        latest_eval = self.get_latest_evaluation()
        
        if latest_impl:
            summary = latest_impl.get("summary", {})
            print(f"\n📋 Laatste implementation:")
            print(f"   - Completed: {summary.get('completed', 0)}")
            print(f"   - Skipped: {summary.get('skipped', 0)}")
        
        if latest_eval:
            # Handle both array and object formats
            if isinstance(latest_eval, list):
                # Array format - find metadata in first item or count items
                print(f"\n🔍 Laatste evaluation:")
                print(f"   - Agents: {len(latest_eval)}")
                for item in latest_eval[:3]:
                    if isinstance(item, dict) and item.get("agent"):
                        print(f"   - {item.get('agent')}: {'✅' if item.get('success') else '❌'}")
            else:
                # Object format with metadata
                meta = latest_eval.get("metadata", {})
                print(f"\n🔍 Laatste evaluation:")
                print(f"   - Testers: {meta.get('totalTesters', '?')}")
                print(f"   - Avg Score: {meta.get('averageScore', '?')}")
        
        # Check if new evaluation needed
        if in_files and out_files:
            latest_in = max(in_files, key=lambda p: p.stat().st_mtime)
            latest_out = max(out_files, key=lambda p: p.stat().st_mtime)
            
            if latest_in.stat().st_mtime > latest_out.stat().st_mtime:
                print("\n⚠️  Implementation is nieuwer dan evaluation - run AI testers!")
            else:
                print("\n✅ Evaluation is up-to-date")
    
    def run_loop(self, auto_mode: bool = False):
        """Run de complete workflow loop."""
        print("\n" + "🔄"*30)
        print("  MAZECHASE AI WORKFLOW ORCHESTRATOR")
        print("🔄"*30)
        
        iteration = 0
        max_iterations = 10 if auto_mode else 1
        
        while iteration < max_iterations:
            iteration += 1
            print(f"\n{'='*60}")
            print(f"  ITERATIE {iteration}")
            print(f"{'='*60}")
            
            # Step 1: Run AI testers
            if not self.run_ai_testers():
                print("❌ AI testers gefaald, stoppen...")
                break
            
            # Step 2: Read evaluation
            evaluation = self.get_latest_evaluation()
            if not evaluation:
                print("❌ Geen evaluation gevonden, stoppen...")
                break
            
            # Get source filename
            latest_eval_file = self.get_latest_file(OUT_DIR, "evaluation-")
            source = latest_eval_file.name if latest_eval_file else "unknown"
            
            # Step 3: Show priorities
            suggestions = self.show_priorities(evaluation)
            
            if not suggestions:
                print("\n🎉 Geen nieuwe suggesties - game is perfect!")
                break
            
            # Step 4: Implementation
            if auto_mode:
                print("\n⚠️  Auto-mode: zou hier Copilot/Claude aanroepen...")
                print("    (Nog niet geïmplementeerd - requires API integration)")
                break
            else:
                tasks = self.interactive_implementation(suggestions, source)
                
                if tasks:
                    # Step 5: Create implementation log
                    self.create_implementation_log(tasks, source)
                    
                    # Ask to continue
                    if input("\n🔄 Nog een iteratie? [y/N]: ").strip().lower() != 'y':
                        break
                else:
                    print("\n👋 Geen taken gelogd, stoppen...")
                    break
        
        print("\n" + "="*60)
        print("✅ Workflow afgerond!")
        print("="*60)


def main():
    orchestrator = WorkflowOrchestrator()
    
    if "--status" in sys.argv:
        orchestrator.show_status()
    elif "--auto" in sys.argv:
        print("⚠️  Auto-mode is experimenteel!")
        if input("Doorgaan? [y/N]: ").strip().lower() == 'y':
            orchestrator.run_loop(auto_mode=True)
    else:
        orchestrator.run_loop(auto_mode=False)


if __name__ == "__main__":
    main()
