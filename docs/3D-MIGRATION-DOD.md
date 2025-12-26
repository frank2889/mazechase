# MazeChase 3D Migratie - Definition of Done

## Overzicht
Migratie van 2D Phaser naar 2.5D/3D met Babylon.js, behoud van bestaande gameplay en multiplayer.

---

## Fase 1: Setup & Proof of Concept (Week 1)

### 1.1 Babylon.js Integratie
- [ ] Babylon.js dependencies toegevoegd aan package.json
- [ ] Babylon.js werkt in SolidJS component met `client:only`
- [ ] Test canvas rendert een simpele 3D scene (cube + plane)
- [ ] Camera besturing met toetsen werkt
- [ ] Geen SSR/build errors

### 1.2 Project Configuratie
- [ ] Asset folders aangemaakt: `public/models/`, `public/textures/`
- [ ] TypeScript types voor Babylon.js correct geconfigureerd
- [ ] Build succesvol met nieuwe dependencies

**Acceptatiecriteria Fase 1:**
> Een standalone test pagina `/test-3d` toont een Babylon.js scene met een bewegende camera.

---

## Fase 2: 3D Maze Rendering (Week 2)

### 2.1 Tilemap naar 3D Conversie
- [ ] Bestaande tilemap data wordt geladen
- [ ] Vloer tiles worden als 3D planes gerenderd
- [ ] Muur tiles worden als 3D cubes gerenderd
- [ ] Pellet posities worden als 3D spheres gerenderd
- [ ] Power-up posities worden als grotere spheres gerenderd

### 2.2 Camera Setup
- [ ] Isometrische/top-down camera gepositioneerd
- [ ] Camera volgt de maze correct
- [ ] Juiste field-of-view voor overzicht

### 2.3 Basis Verlichting
- [ ] Ambient light voor basis zichtbaarheid
- [ ] Directional light voor schaduwen
- [ ] Kleuren matchen met huidige 2D stijl

**Acceptatiecriteria Fase 2:**
> De complete maze wordt in 3D gerenderd met herkenbare muren, vloeren en pellets.

---

## Fase 3: Gameplay Logica (Week 3-4)

### 3.1 Player Movement
- [ ] Speler mesh aangemaakt op correcte startpositie
- [ ] Arrow keys/WASD input verplaatst speler in 3D
- [ ] Grid-based movement behouden (tile per tile)
- [ ] Muur collision detection werkt
- [ ] Beweging is smooth (interpolatie)

### 3.2 Game Mechanics
- [ ] Pellet collectie werkt (collision + verwijderen)
- [ ] Power-up collectie activeert power mode
- [ ] Power mode timer (8 seconden) werkt
- [ ] Score tracking werkt

### 3.3 Chaser/Runner Interactie
- [ ] Alle 4 karakters renderen op correcte posities
- [ ] Collision tussen chaser en runner werkt
- [ ] Kill mechaniek (normaal: runner dood, powered: chaser dood)
- [ ] Game over condities werken

### 3.4 Animaties
- [ ] Karakters hebben bewegingsanimaties
- [ ] Richtingsverandering is zichtbaar
- [ ] Power mode visueel duidelijk (kleur/effect)

**Acceptatiecriteria Fase 3:**
> Single-player gameplay werkt volledig in 3D met alle originele mechanics.

---

## Fase 4: Multiplayer Integratie (Week 5)

### 4.1 WebSocket Koppeling
- [ ] Bestaande WebSocket verbinding hergebruikt
- [ ] Positie updates worden ontvangen en gevisualiseerd
- [ ] Lokale beweging wordt verstuurd naar server
- [ ] Andere spelers zichtbaar in 3D

### 4.2 Game State Synchronisatie
- [ ] Pellet eet events gesynchroniseerd
- [ ] Power-up events gesynchroniseerd
- [ ] Kill events gesynchroniseerd
- [ ] Game over events gesynchroniseerd

### 4.3 Lobby Integratie
- [ ] WaitingRoom werkt met 3D game
- [ ] Countdown -> game start werkt
- [ ] Solo mode met bots werkt

**Acceptatiecriteria Fase 4:**
> 4 spelers kunnen samen spelen in de 3D versie via bestaande server.

---

## Fase 5: Assets & Polish (Week 6-7)

### 5.1 3D Models
- [ ] Muur model (glTF) geïmporteerd
- [ ] Vloer tiles met textuur
- [ ] Runner character model
- [ ] Chaser character models (3 kleuren)
- [ ] Pellet model
- [ ] Power-up model

### 5.2 Textures & Materials
- [ ] Muur textures in huidige kleurstijl
- [ ] Vloer texture
- [ ] Character materials/kleuren
- [ ] Glow effect voor power-ups

### 5.3 Visual Effects
- [ ] Pellet collect particle effect
- [ ] Power mode visual effect (glow/aura)
- [ ] Kill effect (fade out)
- [ ] Game over overlay

### 5.4 Audio (optioneel)
- [ ] Bestaande audio werkt in 3D versie
- [ ] 3D spatial audio (optioneel)

**Acceptatiecriteria Fase 5:**
> Game ziet er visueel aantrekkelijk uit met custom 3D assets.

---

## Fase 6: UI & Polish (Week 7)

### 6.1 UI Overlay
- [ ] Score display werkt boven 3D canvas
- [ ] Spectating text werkt
- [ ] Game over UI werkt
- [ ] Return to lobby knoppen werken

### 6.2 Responsive Design
- [ ] Canvas schaalt met venster
- [ ] UI elementen blijven correct gepositioneerd
- [ ] Mobile touch controls (indien gewenst)

### 6.3 Styling
- [ ] UI stijl past bij 3D esthetiek
- [ ] Tailwind classes aangepast waar nodig
- [ ] Consistent kleurenpalet

**Acceptatiecriteria Fase 6:**
> Alle UI elementen werken correct over de 3D canvas.

---

## Fase 7: Testing & Optimalisatie (Week 8)

### 7.1 Performance
- [ ] Stabiele 60 FPS op mid-range devices
- [ ] Geen memory leaks
- [ ] Asset loading geoptimaliseerd
- [ ] Bundle size acceptabel (<5MB extra)

### 7.2 Cross-browser Testing
- [ ] Chrome werkt
- [ ] Firefox werkt
- [ ] Safari werkt
- [ ] Edge werkt
- [ ] Mobile browsers (basic support)

### 7.3 Bug Fixes
- [ ] Geen collision glitches
- [ ] Netwerk sync issues opgelost
- [ ] UI bugs opgelost

### 7.4 Fallback
- [ ] WebGL niet ondersteund: error message
- [ ] Graceful degradation waar mogelijk

**Acceptatiecriteria Fase 7:**
> Game is stabiel en performant op alle major browsers.

---

## Fase 8: Deployment (Week 9-10)

### 8.1 Build Pipeline
- [ ] Production build succesvol
- [ ] Assets correct gebundeld
- [ ] MIME types correct voor .glb files

### 8.2 Release
- [ ] Deployed naar productie
- [ ] Oude Phaser code verwijderd
- [ ] Dependencies opgeschoond

### 8.3 Documentatie
- [ ] README bijgewerkt
- [ ] Technische documentatie
- [ ] Asset pipeline gedocumenteerd

**Acceptatiecriteria Fase 8:**
> 3D versie live in productie, oude 2D code verwijderd.

---

## Technische Constraints

- **Engine:** Babylon.js (of Three.js als backup)
- **Compatibility:** Moderne browsers (Chrome, Firefox, Safari, Edge)
- **Performance Target:** 60 FPS op mid-range laptop
- **Bundle Size:** Max 5MB extra t.o.v. huidige build
- **Backend:** Geen wijzigingen aan Go server nodig

---

## Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Performance issues | Hoog | Early performance testing, LOD, occlusion culling |
| Asset productie duurt lang | Medium | Begin met placeholders, parallel werken |
| WebGL compatibility issues | Medium | Fallback messaging, feature detection |
| Multiplayer sync issues | Hoog | Uitgebreid testen, interpolatie |

---

## Definition of Done (Global)

Een feature is **DONE** wanneer:
1. ✅ Code geschreven en werkend
2. ✅ Geen TypeScript/build errors
3. ✅ Getest in Chrome + Firefox
4. ✅ Performance acceptabel (geen FPS drops)
5. ✅ Multiplayer sync werkt (indien relevant)
6. ✅ Code gecommit en gepusht
