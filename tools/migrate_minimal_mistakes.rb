#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "yaml"
require "time"
require "date"

ROOT = File.expand_path("..", __dir__)
SRC_ROOT = File.expand_path("../../jekyll/minimal-mistakes-master", __dir__)
SRC_POSTS = File.join(SRC_ROOT, "_posts")
SRC_IMAGES = File.join(SRC_ROOT, "images")
DST_POSTS = File.join(ROOT, "_posts")
DST_IMAGES = File.join(ROOT, "assets", "img", "legacy")

def split_front_matter(raw)
  clean = raw.sub(/\A\uFEFF/, "")
  lines = clean.lines
  return [{}, clean] unless lines.first&.strip == "---"

  closing_idx = nil
  (1...lines.length).each do |i|
    if lines[i].strip == "---"
      closing_idx = i
      break
    end
  end
  return [{}, clean] unless closing_idx

  fm_text = lines[1...closing_idx].join
  body = lines[(closing_idx + 1)..]&.join.to_s
  data = YAML.safe_load(fm_text, permitted_classes: [Time, Date], aliases: false) || {}
  [data, body]
rescue StandardError
  [{}, raw]
end

def normalize_datetime(value)
  t = Time.parse(value.to_s)
  t = t.getlocal("+09:00")
  t.strftime("%Y-%m-%d %H:%M:%S %z")
rescue StandardError
  Time.now.getlocal("+09:00").strftime("%Y-%m-%d %H:%M:%S %z")
end

def normalize_array(value)
  Array(value).map { |x| x.to_s.strip.downcase }.reject(&:empty?).uniq
end

def choose_focus_tag(categories, tags)
  return "life" if categories.include?("life") || tags.include?("life")
  return "study" if categories.include?("note") || categories.include?("study") || tags.include?("study")

  "research"
end

def normalize_body_paths(body)
  body
    .gsub("](/images/", "](/assets/img/legacy/")
    .gsub('src="/images/', 'src="/assets/img/legacy/')
    .gsub("src='/images/", "src='/assets/img/legacy/")
end

def build_front_matter(old)
  categories = normalize_array(old["categories"])
  tags = normalize_array(old["tags"])
  focus = choose_focus_tag(categories, tags)
  tags = ([focus] + tags).uniq

  date_str = normalize_datetime(old["date"])
  draft = old.key?("draft") ? !!old["draft"] : false
  description = old["description"].to_s.strip
  description = old["excerpt"].to_s.strip if description.empty?

  {
    "title" => old["title"].to_s.strip,
    "date" => date_str,
    "last_modified_at" => date_str,
    "description" => description,
    "tags" => tags,
    "categories" => categories,
    "series" => "",
    "toc" => true,
    "draft" => draft,
    "canonical_url" => nil,
    "cover_image" => nil,
    "line_numbers" => false
  }
end

def fm_to_text(fm)
  lines = []
  lines << "---"
  lines << %(title: "#{fm["title"].to_s.gsub('"', '\"')}")
  lines << "date: #{fm["date"]}"
  lines << "last_modified_at: #{fm["last_modified_at"]}"
  lines << %(description: "#{fm["description"].to_s.gsub('"', '\"')}")
  lines << "tags: [#{fm["tags"].map { |t| t.gsub(",", "") }.join(", ")}]"
  lines << "categories: [#{fm["categories"].map { |c| c.gsub(",", "") }.join(", ")}]"
  lines << "series: #{fm["series"]}"
  lines << "toc: #{fm["toc"]}"
  lines << "draft: #{fm["draft"]}"
  lines << "canonical_url:"
  lines << "cover_image:"
  lines << "line_numbers: #{fm["line_numbers"]}"
  lines << "---"
  lines.join("\n")
end

unless Dir.exist?(SRC_POSTS)
  warn "Source posts path not found: #{SRC_POSTS}"
  exit 1
end

FileUtils.mkdir_p(DST_POSTS)
FileUtils.mkdir_p(DST_IMAGES)

if Dir.exist?(SRC_IMAGES)
  Dir.glob(File.join(SRC_IMAGES, "**", "*"), File::FNM_DOTMATCH).each do |src|
    next if File.directory?(src)
    next if File.basename(src) == ".gitkeep"

    rel = src.delete_prefix("#{SRC_IMAGES}/")
    dst = File.join(DST_IMAGES, rel)
    FileUtils.mkdir_p(File.dirname(dst))
    FileUtils.cp(src, dst)
  end
end

count = 0
Dir.glob(File.join(SRC_POSTS, "*.md")).sort.each do |src|
  raw = File.binread(src).force_encoding("UTF-8").encode("UTF-8", invalid: :replace, undef: :replace, replace: "")
  old_fm, body = split_front_matter(raw)
  new_fm = build_front_matter(old_fm)
  new_body = normalize_body_paths(body.to_s).strip
  out = "#{fm_to_text(new_fm)}\n\n#{new_body}\n"
  dst = File.join(DST_POSTS, File.basename(src))
  File.write(dst, out, mode: "w:utf-8")
  count += 1
end

puts "Migrated #{count} posts from #{SRC_POSTS} to #{DST_POSTS}"
puts "Copied images from #{SRC_IMAGES} to #{DST_IMAGES}"
