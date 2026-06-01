'use client'

import React, { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, Text, Plane } from '@react-three/drei'
import * as THREE from 'three'

import DebugTools from '@/components/DebugTools'

const cubeWorldKit = [
  "Axe Stone.glb", "Bamboo Mid.glb", "Bamboo-xBPj13w3JQ.glb", "Bamboo.glb", "Big Crystal.glb", "Blank block.glb", "Brick Block.glb", "Bush.glb", "Button.glb", "Cat.glb", "Cheese Block.glb", "Chest Open.glb", "Chick.glb", "Chicken.glb", "Coal Block.glb", "Crate.glb", "Crystal Block.glb", "Crystal.glb", "Cube Guy Character.glb", "Cube Woman Character.glb", "Dead Tree-4E3IOActVF.glb", "Dead Tree-9dGXS7GrWc.glb", "Dead Tree.glb", "Demon.glb", "Diamond Axe.glb", "Diamond Block.glb", "Diamond Pickaxe.glb", "Diamond Shovel.glb", "Dirt Block.glb", "Dog.glb", "Fence Center.glb", "Fence Corner.glb", "Fence End.glb", "Fence T.glb", "Flowers-0mxlGKYE9P.glb", "Flowers.glb", "Giant.glb", "Goblin.glb", "Gold Axe.glb", "Gold Sword.glb", "Grass Block.glb", "Grass Small.glb", "Grass.glb", "Grey Bricks.glb", "Hedgehog.glb", "Horse.glb", "Ice Block.glb", "Key.glb", "Lever.glb", "Metal Block.glb", "Metal Door.glb", "Mushroom.glb", "Pickaxe Gold.glb", "Pickaxe Wood.glb", "Pig.glb", "Plant-n31PjUy6Ra.glb", "Plant.glb", "Raccoon.glb", "Rail Corner.glb", "Rail Incline.glb", "Rail Straight.glb", "Rock-Xx1Jkg77vJ.glb", "Rock.glb", "Sheep.glb", "Shovel Gold.glb", "Skeleton.glb", "Snow Block.glb", "Steve.glb", "Stone Block.glb", "Stone Pickaxe.glb", "Stone Shovel.glb", "Sword Diamond.glb", "Sword Stone.glb", "Tree-ahBEW2RRgq.glb", "Tree-s8XdT4FOZz.glb", "Tree.glb", "Wolf.glb", "Wood Axe.glb", "Wood Chest.glb", "Wood Planks Block.glb", "Wood Shovel.glb", "Wooden Sword.glb", "Yeti.glb", "Zombie.glb", "minecart.glb"
];

const officePack = [
  "Adjustable Desk.glb", "Air Vent.glb", "Analog clock.glb", "Bathroom Sink.glb", "Bathroom Toilet Paper.glb", "Binder.glb", "Bins.glb", "Blank Picture Frame.glb", "Book Stack.glb", "Briefcase.glb", "CCTV Camera.glb", "Cabinet Bed Drawer Tabl.glb", "Cabinet.glb", "Calendar-8GqQAqxi3qk.glb", "Calendar.glb", "Cardboard Box.glb", "Cardboard Boxes-pMdXdrUHvX.glb", "Cardboard Boxes.glb", "Ceiling Fan.glb", "Ceiling Light.glb", "Chair-1MFMOaz3zqe.glb", "Chair.glb", "Coat rack.glb", "Coffee Table.glb", "Coffee cup.glb", "Computer Screen.glb", "Computer mouse.glb", "Computer.glb", "Couch Medium.glb", "Couch Small-ZOPP3KzNIk.glb", "Couch Small.glb", "Couch _ Wide.glb", "Crushed Soda Can.glb", "Cup.glb", "Curtains Double.glb", "Cushions.glb", "Dartboard.glb", "Darts.glb", "Desk Toy.glb", "Desk-7ban171PzCS.glb", "Desk-EtJlOllzbf.glb", "Desk-ISpMh81QGq.glb", "Desk-V86Go2rlnq.glb", "Desk.glb", "Doorway Front.glb", "Doorway.glb", "Dual Monitors on sit-stand arm.glb", "Electrical outlet.glb", "File Cabinet.glb", "Fire Exit Sign-0ywPpb36cyK.glb", "Fire Exit Sign.glb", "Fire Extinguisher.glb", "Houseplant-VtJh4Irl4w.glb", "Houseplant-bfLOqIV5uP.glb", "Houseplant-e9oRt-Ct6js.glb", "Houseplant.glb", "Keyboard-fOy2zvPJAj-.glb", "Keyboard.glb", "Ladder.glb", "Lamp.glb", "Laptop bag.glb", "Light Cube.glb", "Light Desk.glb", "Light Floor.glb", "Light Icosahedron.glb", "Light Switch.glb", "MS Gundam RX-78-2 with weapons.glb", "Magazine.glb", "Manhole cover.glb", "Medium Book Shelf.glb", "Message board.glb", "Monitor.glb", "Mouse.glb", "Mousepad.glb", "Mug With Office Tool.glb", "Mug.glb", "Night Stand.glb", "Notebook.glb", "Office Chair.glb", "Office Phone.glb", "Pens.glb", "Phone-1L9oJAw6nY2.glb", "Phone.glb", "Plant - White Pot.glb", "Polaroids.glb", "Potted Plant.glb", "Printer.glb", "Rubik's cube.glb", "Rug Round.glb", "Rug.glb", "Shelf Small.glb", "Shelf.glb", "Skateboard.glb", "Small Stack of Paper.glb", "Soda Can.glb", "Soda.glb", "Standing Desk.glb", "Stapler.glb", "Sticky Notes.glb", "Table Large Circular.glb", "Table Tennis Paddle.glb", "Table tennis table.glb", "Table.glb", "Tissue Box.glb", "Toilet Paper stack.glb", "Toilet.glb", "Towel Rack.glb", "Trash Bin.glb", "Trashcan Small.glb", "Trashcan.glb", "Trophy.glb", "Various Stacks of Paper.glb", "Vending Machine.glb", "Wall Art 02.glb", "Wall Art 03.glb", "Wall Art 05.glb", "Wall Art 06-1U5roiXQZAM.glb", "Wall Art 06.glb", "Wall Shelf.glb", "Water Cooler.glb", "Webcam.glb", "Whiteboard.glb", "Window Blinds.glb", "clipboard.glb"
];

const interiorProps = [
  "Air Fryer.glb", "Americanfootball Ball.glb", "Angle Brush.glb", "Bachelor Dresser.glb", "Barbell.glb", "Baseball Bat.glb", "Basket Ball.glb", "Bass Speakers.glb", "Bass.glb", "Bedside Lamp.glb", "Blender.glb", "Bowl.glb", "Boxing Gloves.glb", "Bunk Bed.glb", "Ceiling Lamp-76VCPcN5C8.glb", "Ceiling Lamp-OTJPOdps4p.glb", "Ceiling Lamp-Tz2NayqjsK.glb", "Ceiling Lamp-zq1Fus3I15.glb", "Ceiling Lamp.glb", "Club Arm Chair.glb", "Coffee Cup.glb", "Coffee Machine.glb", "Colored Pencil.glb", "Computer Desk.glb", "Cube Cabinet.glb", "Desk Lamp.glb", "Dish Washer.glb", "Double Bed.glb", "Double Door Base Cabinet.glb", "Double Door Tall Cabinet.glb", "Double Door Upper Cabin.glb", "Drawers Base Cabinet.glb", "Drawers Double Door Bas.glb", "Drum Set.glb", "Dumbell.glb", "Eraser.glb", "Executive Chair.glb", "Executive Desk.glb", "Fan Brush.glb", "Filbert Brush.glb", "Fireplace.glb", "Floating Shelf.glb", "Floor Lamp.glb", "Flute.glb", "Football.glb", "Fork.glb", "Fridge-fpJR5V04e0.glb", "Fridge-z8Q30rFW6E.glb", "Fridge.glb", "Fry Pan.glb", "Gas Stove.glb", "Glass Cup.glb", "Glue.glb", "Guitar.glb", "Gymmat.glb", "Kitchen Stool.glb", "Knife.glb", "L Shaped Desk.glb", "Large Book Shelf.glb", "Large Wardrobe.glb", "Lingerie Dresser.glb", "Medium Book Shelf.glb", "Medium Wardrobe.glb", "Milkjar.glb", "Minimalist Modern Chair.glb", "Mirror.glb", "Modern Kitchen Table.glb", "Monitor.glb", "Mouse.glb", "Notebook.glb", "Open Base Cabinet.glb", "Ottoman Coffe Table.glb", "Oven Solo.glb", "Painting Canvas.glb", "Pencil.glb", "Plastic Cup.glb", "Plate.glb", "Pot.glb", "Protein Powder.glb", "Punching Bag.glb", "Round Brush.glb", "Rounded Coffee Table.glb", "Sauce Pan.glb", "Scissors.glb", "Single Bed.glb", "Single Door Base Cabinet-DKfKjxQyWX.glb", "Single Door Base Cabinet.glb", "Single Door Tall Cabine.glb", "Single Door Upper Cabinet.glb", "Sink Kitchen Cabinet.glb", "Small Bookshelf.glb", "Small Wardrobe.glb", "Speakers.glb", "Spoon.glb", "Standing Desk.glb", "Steel Sink Kitchen Cabinet.glb", "Table Lamp.glb", "Tea Cup.glb", "Three Seater Couch.glb", "Toaster.glb", "Tv.glb", "Two Seater Couch.glb", "Volleyball Ball.glb", "Wash Brush.glb", "Wide Dresser.glb", "Wood Kitchen Chair.glb", "Wood Kitchen Table.glb", "Wooden Arm Chair.glb", "Wooden Chair.glb", "Wooden Kitchen Sink.glb", "Wool Carpet.glb"
];

const models = [
  //...cubeWorldKit.map(name => ({ url: `/models/sims/Cube World Kit-glb/${name}`, name })),
  ...officePack.map(name => ({ url: `/models/sims/Office Pack-glb/${name}`, name })),
  ...interiorProps.map(name => ({ url: `/models/sims/Ultimate Interior Props Pack-glb/${name}`, name }))
];

// Normalize model: compute scale + offset via group transform (no clone needed)
function AssetModel({ url, name }: { url: string, name: string }) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)

  const { normalizedScale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const s = maxDim > 0 ? 2 / maxDim : 1

    return {
      normalizedScale: s,
      offset: new THREE.Vector3(
        -center.x,
        -box.min.y,
        -center.z
      )
    }
  }, [scene])

  return (
    <>
      <group ref={groupRef} scale={normalizedScale}>
        <primitive object={scene} position={[offset.x, offset.y, offset.z]} />
      </group>
      <Text
        position={[0, 2.8, 0]}
        fontSize={0.22}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {name.replace('.glb', '')}
      </Text>
    </>
  )
}

function AssetItem({ url, position, name }: { url: string, position: [number, number, number], name: string }) {
  return (
    <group position={position}>
      <Suspense fallback={
        <Text
          position={[0, 1, 0]}
          fontSize={0.2}
          color="#888888"
          anchorX="center"
          anchorY="middle"
        >
          ...
        </Text>
      }>
        <AssetModel url={url} name={name} />
      </Suspense>
    </group>
  )
}

export default function AssetShowcasePage() {
  const GRID_SIZE = Math.ceil(Math.sqrt(models.length));
  const SPACING = 4;

  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <Canvas
        camera={{ position: [0, 25, 40], fov: 50 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#87CEEB']} />
        <DebugTools title={''} />
        
        <ambientLight intensity={0.7} />
        <directionalLight position={[20, 40, 20]} intensity={1.2} />
        <hemisphereLight args={['#87CEEB', '#d0d5dc', 0.4]} />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            {models.map((modelInfo, index) => {
              const row = Math.floor(index / GRID_SIZE);
              const col = index % GRID_SIZE;
              const x = (col - GRID_SIZE / 2) * SPACING + (SPACING / 2);
              const z = (row - GRID_SIZE / 2) * SPACING + (SPACING / 2);
              
              return (
                <AssetItem 
                  key={modelInfo.url} 
                  url={modelInfo.url} 
                  position={[x, 0, z]} 
                  name={modelInfo.name} 
                />
              )
            })}
          </group>
          
          <Plane 
            args={[300, 300]} 
            rotation={[-Math.PI / 2, 0, 0]} 
            position={[0, -0.01, 0]} 
          >
            <meshStandardMaterial color="#d0d5dc" />
          </Plane>
        </Suspense>

        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </div>
  )
}
