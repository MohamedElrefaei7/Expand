const WORLD_EXTENT_MM = 500;

/** Draws a deterministic, upright world-space image proxy measured in mm. */
export function drawWorldArtwork(context: CanvasRenderingContext2D) {
  context.fillStyle = '#f7f2e6';
  context.fillRect(
    -WORLD_EXTENT_MM,
    -WORLD_EXTENT_MM,
    WORLD_EXTENT_MM * 2,
    WORLD_EXTENT_MM * 2,
  );

  context.save();
  context.strokeStyle = '#d5d0c4';
  context.lineWidth = 0.35;

  for (
    let coordinate = -WORLD_EXTENT_MM;
    coordinate <= WORLD_EXTENT_MM;
    coordinate += 10
  ) {
    context.beginPath();
    context.moveTo(coordinate, -WORLD_EXTENT_MM);
    context.lineTo(coordinate, WORLD_EXTENT_MM);
    context.moveTo(-WORLD_EXTENT_MM, coordinate);
    context.lineTo(WORLD_EXTENT_MM, coordinate);
    context.stroke();
  }

  context.strokeStyle = '#858990';
  context.lineWidth = 0.8;
  for (
    let coordinate = -WORLD_EXTENT_MM;
    coordinate <= WORLD_EXTENT_MM;
    coordinate += 50
  ) {
    context.beginPath();
    context.moveTo(coordinate, -WORLD_EXTENT_MM);
    context.lineTo(coordinate, WORLD_EXTENT_MM);
    context.moveTo(-WORLD_EXTENT_MM, coordinate);
    context.lineTo(WORLD_EXTENT_MM, coordinate);
    context.stroke();
  }
  context.restore();

  context.save();
  context.translate(-118, -66);
  context.fillStyle = '#ea713f';
  context.beginPath();
  context.arc(0, 0, 74, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(115, 74);
  context.fillStyle = '#2469ce';
  context.beginPath();
  context.arc(0, 0, 92, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(0, 20);
  context.rotate(-Math.PI / 7);
  context.fillStyle = '#315c4c';
  context.fillRect(-280, -13, 560, 26);
  context.restore();

  context.fillStyle = '#202b3d';
  context.font = '700 25px Georgia';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('EXPAND', 0, -18);

  context.font = '700 6px Trebuchet MS';
  context.fillText('WORLD-SPACE TEST ARTWORK', 0, 12);

  context.strokeStyle = '#202b3d';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(-WORLD_EXTENT_MM, 0);
  context.lineTo(WORLD_EXTENT_MM, 0);
  context.moveTo(0, -WORLD_EXTENT_MM);
  context.lineTo(0, WORLD_EXTENT_MM);
  context.stroke();

}
