// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "VellumDomain",
    platforms: [
        .iOS(.v18),
        .macOS(.v14),
    ],
    products: [
        .library(name: "VellumDomain", targets: ["VellumDomain"]),
    ],
    targets: [
        .target(name: "VellumDomain"),
        .testTarget(
            name: "VellumDomainTests",
            dependencies: ["VellumDomain"]
        ),
    ]
)
