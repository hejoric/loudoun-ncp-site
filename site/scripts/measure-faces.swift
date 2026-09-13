// Measures where the face sits in each headshot original and prints the manifest
// that scripts/crop-headshots.mjs reads.
//
//   swift scripts/measure-faces.swift assets-src/team/* > scripts/headshot-faces.json
//
// Run it only when a headshot original is added or replaced - the numbers for an
// unchanged photo never change, so the manifest is committed rather than
// recomputed at build time. It uses Apple's Vision framework, so it needs macOS
// and the Xcode command line tools; the cropper it feeds is plain Node and runs
// anywhere. Face detection is a measurement, not a decision: the framing policy
// (how big a face, how high the eyes) lives in the cropper.
import Foundation
import Vision
import ImageIO

struct Measurement { let top: Double, height: Double, centerX: Double, eye: Double }

var entries: [(String, String, Measurement)] = []

for path in CommandLine.arguments.dropFirst() {
    let file = (path as NSString).lastPathComponent
    let slug = (file as NSString).deletingPathExtension
    guard let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        FileHandle.standardError.write("cannot decode \(path)\n".data(using: .utf8)!); exit(1)
    }
    let request = VNDetectFaceLandmarksRequest()
    try! VNImageRequestHandler(cgImage: cg, options: [:]).perform([request])
    guard let faces = request.results, !faces.isEmpty else {
        FileHandle.standardError.write("no face found in \(path)\n".data(using: .utf8)!); exit(1)
    }
    // The subject is the largest face: several of these photos were taken at
    // events and have bystanders in the background.
    let face = faces.max { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }!
    let box = face.boundingBox   // normalized, origin bottom-left

    // Vision's box spans roughly mid-forehead to chin, so it excludes hair. The
    // cropper allows for that; what matters here is that it is measured the same
    // way for everyone.
    let top = 1.0 - (Double(box.origin.y) + Double(box.height))
    let centerX = Double(box.origin.x) + Double(box.width) / 2

    // The eye line is the framing anchor rather than the face centre: heads vary
    // in how much of their height is hair and jaw, and eyes at a consistent
    // height is what makes a row of portraits look aligned.
    var eye = top + Double(box.height) * 0.28   // fallback if landmarks are missing
    if let landmarks = face.landmarks, let left = landmarks.leftEye, let right = landmarks.rightEye {
        let points = left.normalizedPoints + right.normalizedPoints
        let averageY = points.map { Double($0.y) }.reduce(0, +) / Double(points.count)
        eye = 1.0 - (Double(box.origin.y) + averageY * Double(box.height))
    }
    entries.append((slug, file, Measurement(top: top, height: Double(box.height), centerX: centerX, eye: eye)))
}

func round4(_ value: Double) -> String { String(format: "%.4f", value) }
let body = entries.sorted { $0.0 < $1.0 }.map { slug, file, m in
    """
      "\(slug)": {
        "file": "\(file)",
        "faceTop": \(round4(m.top)),
        "faceHeight": \(round4(m.height)),
        "faceCenterX": \(round4(m.centerX)),
        "eyeLine": \(round4(m.eye))
      }
    """
}.joined(separator: ",\n")
print("{\n\(body)\n}")
