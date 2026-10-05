/* oxlint-disable react/immutability -- Rive state-machine inputs are mutable runtime handles. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alignment, Fit, Layout, useRive, useStateMachineInput } from '@rive-app/react-canvas'
import { MOOD, EYES } from '../../examples/KettlebellBot'
import './App.css'

const MACHINE = 'KettlebellBotMachine'
const moods = Object.keys(MOOD)
const emotionButtons = [['acknowledge', 'Acknowledge'], ['surprise', 'Surprise'], ['celebrate', 'Celebrate'], ['frustrated', 'Frustrated'], ['relieved', 'Relieved'], ['wobble', 'Wobble'], ['gearUp', 'Gear up'], ['laugh', 'Laugh'], ['recoil', 'Recoil'], ['powerUp', 'Power up'], ['personalBest', 'Personal best'], ['cheer', 'Cheer'], ['appreciate', 'Appreciate'], ['idea', 'Idea'], ['dizzy', 'Dizzy']] as const
const turnButtons = [['spinLeft', 'Spin left'], ['spinRight', 'Spin right'], ['turnaround', '360° tour'], ['peek', 'Shoulder peek']] as const
const eyeButtons = [['blink', 'Blink'], ['blinkDouble', 'Double blink'], ['wink', 'Wink']] as const
const effectButtons = [['fxSparkles', 'Sparkles'], ['fxMotes', 'Drifting motes'], ['fxSweat', 'Sweat drop'], ['fxDust', 'Landing dust']] as const
type TriggerName = (typeof emotionButtons)[number][0] | (typeof turnButtons)[number][0] | (typeof eyeButtons)[number][0] | (typeof effectButtons)[number][0]
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const wrap = (value: number) => ((value % 360) + 360) % 360

export default function App() {
  const [mood, setMood] = useState(0)
  const [eyes, setEyes] = useState(0)
  const [effectsIntensity, setEffectsIntensity] = useState(1)
  const [facing, setFacing] = useState(0)
  const [gazeX, setGazeX] = useState(0)
  const [gazeY, setGazeY] = useState(0)
  const [intensity, setIntensity] = useState(.62)
  const [previewSize, setPreviewSize] = useState(512)
  const [surface, setSurface] = useState('dark')
  const [hoverLock, setHoverLock] = useState(false)
  const [pressLock, setPressLock] = useState(false)
  const [inside, setInside] = useState(false)
  const [down, setDown] = useState(false)
  const [lastAction, setLastAction] = useState('Ready for a reaction')
  const drag = useRef<{ id: number; x: number; facing: number; moved: number } | null>(null)

  const { rive, RiveComponent } = useRive({
    src: '/kettlebell-bot.riv',
    artboard: 'KettlebellBot',
    stateMachines: MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  })

  const status = useStateMachineInput(rive, MACHINE, 'status')
  const facingInput = useStateMachineInput(rive, MACHINE, 'facing')
  const gazeXInput = useStateMachineInput(rive, MACHINE, 'gazeX')
  const gazeYInput = useStateMachineInput(rive, MACHINE, 'gazeY')
  const intensityInput = useStateMachineInput(rive, MACHINE, 'intensity')
  const hoverInput = useStateMachineInput(rive, MACHINE, 'hover')
  const pressedInput = useStateMachineInput(rive, MACHINE, 'pressed')
  const eyesInput = useStateMachineInput(rive, MACHINE, 'eyes')
  const effectsIntensityInput = useStateMachineInput(rive, MACHINE, 'effectsIntensity')

  const acknowledge = useStateMachineInput(rive, MACHINE, 'acknowledge')
  const surprise = useStateMachineInput(rive, MACHINE, 'surprise')
  const celebrate = useStateMachineInput(rive, MACHINE, 'celebrate')
  const frustrated = useStateMachineInput(rive, MACHINE, 'frustrated')
  const relieved = useStateMachineInput(rive, MACHINE, 'relieved')
  const wobble = useStateMachineInput(rive, MACHINE, 'wobble')
  const gearUp = useStateMachineInput(rive, MACHINE, 'gearUp')
  const laugh = useStateMachineInput(rive, MACHINE, 'laugh')
  const recoil = useStateMachineInput(rive, MACHINE, 'recoil')
  const spinLeft = useStateMachineInput(rive, MACHINE, 'spinLeft')
  const spinRight = useStateMachineInput(rive, MACHINE, 'spinRight')
  const turnaround = useStateMachineInput(rive, MACHINE, 'turnaround')
  const peek = useStateMachineInput(rive, MACHINE, 'peek')
  const blink = useStateMachineInput(rive, MACHINE, 'blink')
  const blinkDouble = useStateMachineInput(rive, MACHINE, 'blinkDouble')
  const wink = useStateMachineInput(rive, MACHINE, 'wink')
  const tapped = useStateMachineInput(rive, MACHINE, 'tapped')

  const powerUp = useStateMachineInput(rive, MACHINE, 'powerUp')
  const personalBest = useStateMachineInput(rive, MACHINE, 'personalBest')
  const cheer = useStateMachineInput(rive, MACHINE, 'cheer')
  const appreciate = useStateMachineInput(rive, MACHINE, 'appreciate')
  const idea = useStateMachineInput(rive, MACHINE, 'idea')
  const dizzy = useStateMachineInput(rive, MACHINE, 'dizzy')
  const fxSparkles = useStateMachineInput(rive, MACHINE, 'fxSparkles')
  const fxMotes = useStateMachineInput(rive, MACHINE, 'fxMotes')
  const fxSweat = useStateMachineInput(rive, MACHINE, 'fxSweat')
  const fxDust = useStateMachineInput(rive, MACHINE, 'fxDust')

  const triggers = useMemo(() => ({
    acknowledge, surprise, celebrate, frustrated, relieved, wobble, gearUp, laugh,
    powerUp, personalBest, cheer, appreciate, idea, dizzy,
    fxSparkles, fxMotes, fxSweat, fxDust,
    recoil, spinLeft, spinRight, turnaround, peek, blink, blinkDouble, wink,
  }), [fxSparkles, fxMotes, fxSweat, fxDust, powerUp, personalBest, cheer, appreciate, idea, dizzy, acknowledge, surprise, celebrate, frustrated, relieved, wobble, gearUp, laugh, recoil, spinLeft, spinRight, turnaround, peek, blink, blinkDouble, wink])

  useEffect(() => { if (status) status.value = mood }, [status, mood])
  useEffect(() => { if (eyesInput) eyesInput.value = eyes }, [eyesInput, eyes])
  useEffect(() => { if (effectsIntensityInput) effectsIntensityInput.value = effectsIntensity }, [effectsIntensityInput, effectsIntensity])
  useEffect(() => { if (facingInput) facingInput.value = facing }, [facingInput, facing])
  useEffect(() => { if (gazeXInput) gazeXInput.value = gazeX }, [gazeXInput, gazeX])
  useEffect(() => { if (gazeYInput) gazeYInput.value = gazeY }, [gazeYInput, gazeY])
  useEffect(() => { if (intensityInput) intensityInput.value = intensity }, [intensityInput, intensity])
  useEffect(() => { if (hoverInput) hoverInput.value = hoverLock || inside }, [hoverInput, hoverLock, inside])
  useEffect(() => { if (pressedInput) pressedInput.value = pressLock || down }, [pressedInput, pressLock, down])

  function fire(name: TriggerName) {
    triggers[name]?.fire()
    setLastAction(name === 'turnaround' ? 'Playing the full 360° tour' : `${name} fired`)
  }

  function look(event: React.PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    setGazeX(clamp(((event.clientX - box.left) / box.width) * 2 - 1, -1, 1))
    setGazeY(clamp(((event.clientY - box.top) / box.height) * 2 - 1, -1, 1))
  }

  function start(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: event.pointerId, x: event.clientX, facing, moved: 0 }
    setDown(true)
    look(event)
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    look(event)
    const active = drag.current
    if (!active || active.id !== event.pointerId) return
    const delta = event.clientX - active.x
    active.moved = Math.max(active.moved, Math.abs(delta))
    setFacing(wrap(active.facing + delta * .9))
  }

  function finish(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current
    drag.current = null
    setDown(false)
    if (active && active.moved < 7) {
      tapped?.fire()
      setLastAction('tapped fired')
    }
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  function reset() {
    setMood(0); setEyes(0); setEffectsIntensity(1); setFacing(0); setGazeX(0); setGazeY(0); setIntensity(.62)
    setHoverLock(false); setPressLock(false); setLastAction('Back to calm, facing front')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">RIVE INTERACTION LAB</p><h1>Kettlebell Bot</h1></div>
        <div className="runtime-status"><span className={rive ? 'status-dot live' : 'status-dot'} />{rive ? 'Runtime connected' : 'Loading asset…'}</div>
      </header>

      <section className="lab-grid" aria-label="Kettlebell Bot playground">
        <section className="stage-card" aria-label="Interactive bot stage">
          <div className="stage-labels"><span>drag to turn</span><span>tap to react</span></div>
          <div className={`bot-stage surface-${surface}`} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerEnter={() => setInside(true)} onPointerLeave={() => { setInside(false); setDown(false) }}>
            <div className="stage-glow" />
            <div className="bot-preview" style={{ width: previewSize, height: previewSize, flexShrink: 0 }}>
              <RiveComponent className="rive-canvas" />
            </div>
          </div>
          <div className="stage-readout"><span><b>{moods[mood]}</b> mood</span><span><b>{Math.round(facing)}°</b> facing</span><span><b>{Math.round(intensity * 100)}%</b> energy</span></div>
        </section>

        <section className="controls-card">
          <div className="section-heading"><div><p className="eyebrow">PLAYGROUND</p><h2>Drive the character</h2></div><button className="quiet-button" type="button" onClick={reset}>Reset</button></div>
          <section className="stage-effects" aria-label="Particle effects">
            <div className="field-title"><h3>Small particle accents</h3><label className="field effects-strength"><span>Particle visibility <output>{Math.round(effectsIntensity * 100)}%</output></span><input aria-label="Particle visibility" type="range" min="0" max="1" step=".05" value={effectsIntensity} onChange={(event) => setEffectsIntensity(Number(event.target.value))} /></label></div>
            <div className="effect-buttons">{effectButtons.map(([name, label]) => <button key={name} type="button" onClick={() => fire(name)}>{label}</button>)}<button type="button" className="quiet-button" onClick={() => setEffectsIntensity(effectsIntensity === 0 ? 1 : 0)}>{effectsIntensity === 0 ? 'Show particles' : 'Hide particles'}</button></div>
            <p className="effects-note">Play with any mood or eye shape. Drag the bot while an effect is playing to see it follow the turn.</p>
          </section>
          <label className="field"><span>Mood</span><select value={mood} onChange={(event) => setMood(Number(event.target.value))}>{moods.map((name, index) => <option key={name} value={index}>{index} · {name}</option>)}</select></label>
          <label className="field"><span>Eye shape</span><select value={eyes} onChange={(event) => setEyes(Number(event.target.value))}>{Object.entries(EYES).map(([name, value]) => <option key={name} value={value}>{name === 'auto' ? 'Automatic · follow mood' : name}</option>)}</select></label>
          <div className="field"><div className="field-title"><span>Facing</span><output>{Math.round(facing)}°</output></div><input type="range" min="0" max="360" value={facing} onChange={(event) => setFacing(Number(event.target.value))} /><div className="facing-buttons">{[[0, 'Front'], [90, 'Right'], [180, 'Back'], [270, 'Left']].map(([angle, label]) => <button key={String(angle)} type="button" onClick={() => setFacing(Number(angle))}>{label}</button>)}</div></div>
          <div className="field"><div className="field-title"><span>Gaze</span><output>{gazeX.toFixed(1)}, {gazeY.toFixed(1)}</output></div><div className="gaze-controls"><label>Horizontal<input type="range" min="-1" max="1" step=".05" value={gazeX} onChange={(event) => setGazeX(Number(event.target.value))} /></label><label>Vertical<input type="range" min="-1" max="1" step=".05" value={gazeY} onChange={(event) => setGazeY(Number(event.target.value))} /></label></div></div>
          <div className="field"><div className="field-title"><span>Energy</span><output>{Math.round(intensity * 100)}%</output></div><input type="range" min="0" max="1" step=".01" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} /></div>
          <div className="preview-controls"><label className="field"><span>Preview size</span><select value={previewSize} onChange={(event) => setPreviewSize(Number(event.target.value))}>{[44, 64, 160, 512].map((size) => <option key={size} value={size}>{size} px</option>)}</select></label><label className="field"><span>Surface</span><select value={surface} onChange={(event) => setSurface(event.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select></label></div>
          <div className="toggle-row"><label><input type="checkbox" checked={hoverLock} onChange={(event) => setHoverLock(event.target.checked)} /> Lock hover</label><label><input type="checkbox" checked={pressLock} onChange={(event) => setPressLock(event.target.checked)} /> Lock press</label></div>
        </section>
      </section>

      <section className="actions-card">
        <div className="section-heading"><div><p className="eyebrow">ONE-SHOT RESPONSES</p><h2>Make it react</h2></div><p className="action-log" aria-live="polite">{lastAction}</p></div>
        <div className="action-groups"><ActionGroup title="Emotions" items={emotionButtons} onFire={fire} /><ActionGroup title="Turns" items={turnButtons} onFire={fire} /><ActionGroup title="Eyes" items={eyeButtons} onFire={fire} /></div>
      </section>

    </main>
  )
}

function ActionGroup({ title, items, onFire }: { title: string; items: readonly (readonly [TriggerName, string])[]; onFire: (name: TriggerName) => void }) {
  return <div className="action-group"><h3>{title}</h3><div className="button-grid">{items.map(([name, label]) => <button key={name} type="button" onClick={() => onFire(name)}>{label}</button>)}</div></div>
}
