import { describe, expect, it } from 'vitest'
import { journeyFromConversation, journeySignal } from './intent'

/**
 * The cases that matter are the ones where it should do nothing.
 *
 * Moving somebody is expensive — it takes two pages out of their navigation —
 * so almost every test below is checking that a sentence which merely
 * mentions the other half of the product does not move them.
 */

describe('journeySignal', () => {
  it('reads first-person buying intent', () => {
    expect(journeySignal('I want to buy a car')).toBe('buyer')
    expect(journeySignal('what car should I get for 30 million?')).toBe('buyer')
    expect(journeySignal('looking for a car that is cheap on fuel')).toBe('buyer')
    expect(journeySignal('any cars under 25m?')).toBe('buyer')
  })

  it('reads somebody standing next to a fault', () => {
    expect(journeySignal('my car is making a rattling noise')).toBe('owner')
    expect(journeySignal('the check engine light came on')).toBe('owner')
    expect(journeySignal("it won't start this morning")).toBe('owner')
    expect(journeySignal('there is a strange smell from the engine')).toBe('owner')
  })

  it('says nothing about a sentence that is neither', () => {
    expect(journeySignal('hello')).toBeNull()
    expect(journeySignal('what does that mean?')).toBeNull()
    expect(journeySignal('thanks, that helps')).toBeNull()
  })

  it('does not treat buying a PART as buying a car', () => {
    // An owner with a fault, and exactly the sentence a looser pattern would
    // take them out of Diagnose for.
    expect(journeySignal('where can I buy brake pads?')).toBeNull()
    expect(journeySignal('how much to buy a new battery')).toBeNull()
  })

  it('stays put when somebody weighs a repair against replacing the car', () => {
    // A real thing to say, and not a reason to move anyone anywhere.
    expect(journeySignal('my car needs a service — should I buy another one instead?')).toBeNull()
  })
})

describe('journeyFromConversation', () => {
  it('ignores a single passing mention', () => {
    // The whole reason this reads conversations rather than messages.
    const talk = [
      'my car is making a noise',
      'my brother wants to buy a Vitz',
      'anyway, about the noise',
    ]
    expect(journeyFromConversation(talk, 'owner')).toBeNull()
  })

  it('moves somebody once the conversation has actually turned', () => {
    const talk = ['my car is making a noise', 'I want to buy a car instead', 'what car should I get?']
    expect(journeyFromConversation(talk, 'owner')).toBe('buyer')
  })

  it('moves a buyer who turns up with a fault', () => {
    const talk = ['what car should I buy?', 'my car is overheating', "it won't start now"]
    expect(journeyFromConversation(talk, 'buyer')).toBe('owner')
  })

  it('will not move somebody on one turn however clear it is', () => {
    expect(journeyFromConversation(['I want to buy a car'], 'owner')).toBeNull()
  })

  it('stays put when they are already where the talk points', () => {
    const talk = ['I want to buy a car', 'what car should I get?']
    expect(journeyFromConversation(talk, 'buyer')).toBeNull()
  })

  it('needs the other direction to be winning, not merely present', () => {
    // Two each way: real ambiguity, and moving them would be a coin toss.
    const talk = [
      'I want to buy a car',
      'my car is making a noise',
      'what car should I get?',
      'the engine light is on',
    ]
    expect(journeyFromConversation(talk, 'owner')).toBeNull()
  })

  it('forgets evidence that has scrolled out of the window', () => {
    const talk = [
      'I want to buy a car',
      'what car should I get?',
      // Six turns of something else pushes the buying talk out of range.
      'ok',
      'thanks',
      'right',
      'I see',
      'go on',
      'and then?',
    ]
    expect(journeyFromConversation(talk, 'owner')).toBeNull()
  })

  it('treats an unset journey as somewhere to move from', () => {
    const talk = ['I want to buy a car', 'what car should I get?']
    expect(journeyFromConversation(talk, null)).toBe('buyer')
  })
})
