
import sys
from pathlib import Path

import streamlit as st
from PIL import Image

from config import (
    IMAGE_DIR,
    available_screening_conditions,
    best_model_path,
    condition_label_es,
    review_threshold,
)

MAX_LIST = 500


@st.cache_resource(show_spinner='Cargando modelo…')
def get_model(weights_path):
    from inference import load_model
    return load_model(weights_path)


def list_images(folder, query):
    folder = Path(folder)
    if not folder.is_dir():
        return []
    q = query.strip().lower()
    names = [
        f.name for f in folder.iterdir()
        if f.suffix.lower() in ('.png', '.jpg', '.jpeg')
        and (not q or q in f.name.lower())
    ]
    return sorted(names)[:MAX_LIST]


def run_screening(image, conditions):
    from inference import predict_image

    results = []
    for condition in conditions:
        weights = best_model_path(condition)
        if not Path(weights).is_file():
            continue
        model = get_model(weights)
        results.append(predict_image(image, model, condition=condition))
    return results


def show_result(result):
    prob = result['probability']
    label = result['condition_label']
    st.subheader(label)
    st.metric(f'Probabilidad de {label}', f'{prob:.1%}')
    if result['flagged']:
        st.warning(
            f'Marcado para revisión (umbral {result["threshold"]:.0%}). '
            f'{result["recommendation"]}.'
        )
    else:
        st.success(f'Por debajo del umbral ({result["threshold"]:.0%}). '
                   f'{result["recommendation"]}.')
    st.divider()


def show_results(results, source_label):
    if not results:
        st.error('No hay modelos cargados para las condiciones seleccionadas.')
        return
    for result in results:
        show_result(result)
    st.caption(f'Origen: {source_label}')
    st.caption(
        'Aviso: herramienta de tamizaje preliminar únicamente. '
        'Todos los resultados deben ser revisados por un médico calificado.'
    )


def run():
    st.set_page_config(page_title='Tamizaje de tórax', layout='wide')
    st.title('Radiografía de tórax — tamizaje')
    st.caption('Solo tamizaje preliminar. No constituye un diagnóstico médico.')

    trained = available_screening_conditions()
    if not trained:
        st.error(
            'No se encontraron modelos entrenados en `checkpoints/`. '
            'Entrene al menos una condición (p. ej. `python train.py --condition Effusion`).'
        )
        return

    selected = st.sidebar.multiselect(
        'Condiciones a evaluar:',
        trained,
        default=trained,
        format_func=condition_label_es,
    )
    if not selected:
        st.warning('Seleccione al menos una condición en la barra lateral.')
        return

    st.sidebar.markdown('**Umbrales de revisión**')
    for condition in selected:
        st.sidebar.caption(
            f'{condition_label_es(condition)}: {review_threshold(condition):.0%}'
        )

    tab_folder, tab_upload = st.tabs(['Desde carpeta', 'Subir archivo'])

    with tab_folder:
        folder = st.text_input('Carpeta de imágenes:', IMAGE_DIR)
        query = st.text_input('Filtrar por nombre:', placeholder='ej. 00000011')
        names = list_images(folder, query)

        if not names:
            st.info(
                'No hay imágenes en la carpeta (o la carpeta no existe). '
                'Ajuste la ruta o el filtro.'
            )
            return

        if len(names) == MAX_LIST:
            st.caption(
                f'Se muestran las primeras {MAX_LIST} coincidencias: acote el filtro.'
            )
        choice = st.selectbox('Seleccionar imagen:', names)
        path = Path(folder) / choice

        col_img, col_res = st.columns(2)
        with col_img:
            st.image(str(path), caption=choice, width='stretch')
        with col_res:
            if st.button('Ejecutar tamizaje', key='run_folder'):
                try:
                    show_results(run_screening(path, selected), str(path))
                except Exception as e:
                    st.error(f'Error en la inferencia: {e}')

    with tab_upload:
        uploaded = st.file_uploader(
            'Elija una radiografía:', type=['png', 'jpg', 'jpeg']
        )
        if not uploaded:
            return

        image = Image.open(uploaded)
        col_img, col_res = st.columns(2)
        with col_img:
            st.image(image, caption=uploaded.name, width='stretch')
        with col_res:
            if st.button('Ejecutar tamizaje', key='run_upload'):
                try:
                    show_results(run_screening(image, selected), uploaded.name)
                except Exception as e:
                    st.error(f'Error en la inferencia: {e}')


def _in_streamlit():
    try:
        from streamlit.runtime.scriptrunner import get_script_run_ctx
        return get_script_run_ctx() is not None
    except Exception:
        return False


if __name__ == '__main__' and not _in_streamlit():
    import subprocess
    print('Iniciando Streamlit…')
    raise SystemExit(
        subprocess.call([sys.executable, '-m', 'streamlit', 'run', __file__])
    )

run()
