import * as BABYLON from '@babylonjs/core';
import type { Zone, MazeUpdate } from '../game/connection';

export type TimePhase = 'day' | 'dusk' | 'night' | 'dawn';

/**
 * ZoneRenderer - Visualizes zones and handles day/night cycle
 */
export class ZoneRenderer {
    private scene: BABYLON.Scene;
    private zones: Map<number, ZoneMesh> = new Map();
    private currentPhase: TimePhase = 'day';
    private phaseProgress: number = 0;
    private ambientLight: BABYLON.HemisphericLight | null = null;
    private sunLight: BABYLON.DirectionalLight | null = null;
    private skybox: BABYLON.Mesh | null = null;
    
    // Phase colors
    private readonly phaseColors: Record<TimePhase, PhaseConfig> = {
        day: {
            ambient: new BABYLON.Color3(0.8, 0.8, 0.9),
            sun: new BABYLON.Color3(1, 0.95, 0.8),
            fog: new BABYLON.Color3(0.5, 0.6, 0.8),
            intensity: 1.0
        },
        dusk: {
            ambient: new BABYLON.Color3(0.6, 0.4, 0.5),
            sun: new BABYLON.Color3(1, 0.5, 0.3),
            fog: new BABYLON.Color3(0.4, 0.3, 0.4),
            intensity: 0.6
        },
        night: {
            ambient: new BABYLON.Color3(0.1, 0.1, 0.2),
            sun: new BABYLON.Color3(0.2, 0.2, 0.4),
            fog: new BABYLON.Color3(0.05, 0.05, 0.1),
            intensity: 0.2
        },
        dawn: {
            ambient: new BABYLON.Color3(0.5, 0.4, 0.5),
            sun: new BABYLON.Color3(1, 0.6, 0.4),
            fog: new BABYLON.Color3(0.4, 0.35, 0.45),
            intensity: 0.5
        }
    };
    
    // Zone colors
    private readonly zoneColors: Record<string, BABYLON.Color3> = {
        safe: new BABYLON.Color3(0.2, 0.8, 0.3),
        neutral: new BABYLON.Color3(0.8, 0.8, 0.2),
        danger: new BABYLON.Color3(0.9, 0.2, 0.2)
    };
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.setupLighting();
    }
    
    /**
     * Setup ambient and directional lighting
     */
    private setupLighting(): void {
        // Find existing lights or create new ones
        this.ambientLight = this.scene.getLightByName('ambient') as BABYLON.HemisphericLight;
        if (!this.ambientLight) {
            this.ambientLight = new BABYLON.HemisphericLight(
                'ambient',
                new BABYLON.Vector3(0, 1, 0),
                this.scene
            );
        }
        
        this.sunLight = this.scene.getLightByName('sun') as BABYLON.DirectionalLight;
        if (!this.sunLight) {
            this.sunLight = new BABYLON.DirectionalLight(
                'sun',
                new BABYLON.Vector3(-1, -2, -1),
                this.scene
            );
            this.sunLight.intensity = 0.7;
        }
        
        // Enable fog
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this.scene.fogDensity = 0.02;
        
        this.applyPhaseColors(this.currentPhase, 0);
    }
    
    /**
     * Create zone visualization meshes
     */
    public createZones(zones: Zone[]): void {
        // Clear existing zones
        this.clearZones();
        
        for (const zone of zones) {
            this.createZoneMesh(zone);
        }
    }
    
    /**
     * Create a single zone mesh
     */
    private createZoneMesh(zone: Zone): void {
        // Create ground plane for zone
        const ground = BABYLON.MeshBuilder.CreateGround(
            `zone_${zone.id}`,
            {
                width: zone.width,
                height: zone.height,
                subdivisions: 4
            },
            this.scene
        );
        
        // Position at zone center, slightly below maze floor
        ground.position = new BABYLON.Vector3(
            zone.x + zone.width / 2,
            -0.05,
            zone.y + zone.height / 2
        );
        
        // Create material
        const material = new BABYLON.StandardMaterial(`zoneMat_${zone.id}`, this.scene);
        const color = this.zoneColors[zone.type] || this.zoneColors.neutral;
        material.diffuseColor = color;
        material.alpha = zone.isActive ? 0.2 : 0.1;
        material.backFaceCulling = false;
        material.emissiveColor = color.scale(0.3);
        ground.material = material;
        
        // Create border
        const border = this.createZoneBorder(zone);
        
        // Create zone label
        const label = this.createZoneLabel(zone);
        
        // Store zone mesh data
        this.zones.set(zone.id, {
            ground,
            border,
            label,
            zone
        });
    }
    
    /**
     * Create zone border lines
     */
    private createZoneBorder(zone: Zone): BABYLON.LinesMesh {
        const y = 0.05;
        const points = [
            new BABYLON.Vector3(zone.x, y, zone.y),
            new BABYLON.Vector3(zone.x + zone.width, y, zone.y),
            new BABYLON.Vector3(zone.x + zone.width, y, zone.y + zone.height),
            new BABYLON.Vector3(zone.x, y, zone.y + zone.height),
            new BABYLON.Vector3(zone.x, y, zone.y) // Close the loop
        ];
        
        const color = this.zoneColors[zone.type] || this.zoneColors.neutral;
        const colors = points.map(() => new BABYLON.Color4(color.r, color.g, color.b, 1));
        
        const lines = BABYLON.MeshBuilder.CreateLines(
            `zoneBorder_${zone.id}`,
            { points, colors },
            this.scene
        );
        
        return lines;
    }
    
    /**
     * Create floating zone label
     */
    private createZoneLabel(zone: Zone): BABYLON.Mesh | null {
        // For now, skip text labels (requires extra setup)
        // Could use DynamicTexture or GUI in the future
        return null;
    }
    
    /**
     * Update zones when they change (e.g., safe zone deactivation)
     */
    public updateZones(zones: Zone[]): void {
        for (const zone of zones) {
            const existing = this.zones.get(zone.id);
            if (existing) {
                // Update zone state
                existing.zone = zone;
                
                // Update material
                const material = existing.ground.material as BABYLON.StandardMaterial;
                if (material) {
                    const color = this.zoneColors[zone.type] || this.zoneColors.neutral;
                    material.diffuseColor = color;
                    material.alpha = zone.isActive ? 0.2 : 0.08;
                    material.emissiveColor = color.scale(zone.isActive ? 0.3 : 0.1);
                }
            } else {
                // Create new zone
                this.createZoneMesh(zone);
            }
        }
    }
    
    /**
     * Set current phase and update lighting
     */
    public setPhase(phase: TimePhase, zones?: Zone[]): void {
        this.currentPhase = phase;
        this.phaseProgress = 0;
        
        // Animate transition
        this.animatePhaseTransition(phase);
        
        // Update zones if provided
        if (zones) {
            this.updateZones(zones);
        }
    }
    
    /**
     * Update phase progress (called each tick from server)
     */
    public updatePhaseProgress(phase: TimePhase, progress: number): void {
        this.currentPhase = phase;
        this.phaseProgress = progress;
        
        // Apply interpolated colors based on progress to next phase
        this.applyPhaseColors(phase, progress);
    }
    
    /**
     * Animate transition between phases
     */
    private animatePhaseTransition(targetPhase: TimePhase): void {
        const config = this.phaseColors[targetPhase];
        const duration = 2000; // 2 seconds
        
        // Animate ambient light
        if (this.ambientLight) {
            const startColor = this.ambientLight.diffuse.clone();
            const animation = new BABYLON.Animation(
                'phaseAmbient',
                'diffuse',
                30,
                BABYLON.Animation.ANIMATIONTYPE_COLOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            animation.setKeys([
                { frame: 0, value: startColor },
                { frame: 60, value: config.ambient }
            ]);
            this.ambientLight.animations = [animation];
            this.scene.beginAnimation(this.ambientLight, 0, 60, false);
        }
        
        // Animate sun light
        if (this.sunLight) {
            const startColor = this.sunLight.diffuse.clone();
            const startIntensity = this.sunLight.intensity;
            
            // Color animation
            const colorAnim = new BABYLON.Animation(
                'phaseSun',
                'diffuse',
                30,
                BABYLON.Animation.ANIMATIONTYPE_COLOR3,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            colorAnim.setKeys([
                { frame: 0, value: startColor },
                { frame: 60, value: config.sun }
            ]);
            
            // Intensity animation
            const intensityAnim = new BABYLON.Animation(
                'phaseSunIntensity',
                'intensity',
                30,
                BABYLON.Animation.ANIMATIONTYPE_FLOAT,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            intensityAnim.setKeys([
                { frame: 0, value: startIntensity },
                { frame: 60, value: config.intensity * 0.7 }
            ]);
            
            this.sunLight.animations = [colorAnim, intensityAnim];
            this.scene.beginAnimation(this.sunLight, 0, 60, false);
        }
        
        // Animate fog
        const startFog = this.scene.fogColor.clone();
        const fogAnim = new BABYLON.Animation(
            'phaseFog',
            'fogColor',
            30,
            BABYLON.Animation.ANIMATIONTYPE_COLOR3,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        fogAnim.setKeys([
            { frame: 0, value: startFog },
            { frame: 60, value: config.fog }
        ]);
        this.scene.animations = [fogAnim];
        this.scene.beginAnimation(this.scene, 0, 60, false);
        
        // Adjust fog density based on phase
        if (targetPhase === 'night') {
            this.scene.fogDensity = 0.04;
        } else if (targetPhase === 'dusk' || targetPhase === 'dawn') {
            this.scene.fogDensity = 0.03;
        } else {
            this.scene.fogDensity = 0.02;
        }
    }
    
    /**
     * Apply phase colors directly (for progress updates)
     */
    private applyPhaseColors(phase: TimePhase, progress: number): void {
        const config = this.phaseColors[phase];
        const nextPhase = this.getNextPhase(phase);
        const nextConfig = this.phaseColors[nextPhase];
        
        // Interpolate towards next phase based on progress
        const t = progress;
        
        if (this.ambientLight) {
            this.ambientLight.diffuse = BABYLON.Color3.Lerp(config.ambient, nextConfig.ambient, t);
        }
        
        if (this.sunLight) {
            this.sunLight.diffuse = BABYLON.Color3.Lerp(config.sun, nextConfig.sun, t);
            this.sunLight.intensity = config.intensity + (nextConfig.intensity - config.intensity) * t;
        }
        
        this.scene.fogColor = BABYLON.Color3.Lerp(config.fog, nextConfig.fog, t);
    }
    
    /**
     * Get the next phase in the cycle
     */
    private getNextPhase(current: TimePhase): TimePhase {
        const order: TimePhase[] = ['day', 'dusk', 'night', 'dawn'];
        const idx = order.indexOf(current);
        return order[(idx + 1) % order.length];
    }
    
    /**
     * Get zone at position
     */
    public getZoneAt(x: number, y: number): Zone | null {
        for (const zoneMesh of this.zones.values()) {
            const z = zoneMesh.zone;
            if (x >= z.x && x < z.x + z.width && y >= z.y && y < z.y + z.height) {
                return z;
            }
        }
        return null;
    }
    
    /**
     * Check if position is in a safe zone
     */
    public isInSafeZone(x: number, y: number): boolean {
        const zone = this.getZoneAt(x, y);
        return zone !== null && zone.type === 'safe' && zone.isActive;
    }
    
    /**
     * Get current phase
     */
    public getCurrentPhase(): TimePhase {
        return this.currentPhase;
    }
    
    /**
     * Clear all zone visualizations
     */
    private clearZones(): void {
        for (const zoneMesh of this.zones.values()) {
            zoneMesh.ground.dispose();
            zoneMesh.border.dispose();
            if (zoneMesh.label) {
                zoneMesh.label.dispose();
            }
        }
        this.zones.clear();
    }
    
    /**
     * Dispose all resources
     */
    public dispose(): void {
        this.clearZones();
        // Don't dispose lights - they might be shared
    }
}

interface ZoneMesh {
    ground: BABYLON.Mesh;
    border: BABYLON.LinesMesh;
    label: BABYLON.Mesh | null;
    zone: Zone;
}

interface PhaseConfig {
    ambient: BABYLON.Color3;
    sun: BABYLON.Color3;
    fog: BABYLON.Color3;
    intensity: number;
}
