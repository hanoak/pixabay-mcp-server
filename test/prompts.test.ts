import { describe, expect, it } from 'vitest'
import { buildFindMediaPrompt } from '../src/prompts.js'

describe('buildFindMediaPrompt', () => {
  it('includes both tool calls for media_type "both"', () => {
    const prompt = buildFindMediaPrompt('mountain sunrise', 'both')
    expect(prompt).toContain('pixabay_search_images with query: "mountain sunrise"')
    expect(prompt).toContain('pixabay_search_videos with query: "mountain sunrise"')
  })

  it('includes only the images tool call for media_type "images"', () => {
    const prompt = buildFindMediaPrompt('cats', 'images')
    expect(prompt).toContain('pixabay_search_images with query: "cats"')
    expect(prompt).not.toContain('pixabay_search_videos')
  })

  it('includes only the videos tool call for media_type "videos"', () => {
    const prompt = buildFindMediaPrompt('ocean waves', 'videos')
    expect(prompt).toContain('pixabay_search_videos with query: "ocean waves"')
    expect(prompt).not.toContain('pixabay_search_images')
  })

  it('mentions courtesy attribution guidance', () => {
    const prompt = buildFindMediaPrompt('forest', 'both')
    expect(prompt).toContain('via Pixabay')
  })
})
